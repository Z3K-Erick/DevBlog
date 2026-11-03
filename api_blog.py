"""
DevBlog — API REST de Administración de Contenido y Orquestación Editorial (Puerto 8001)
========================================================================================
Servicio REST con FastAPI y SQLite que administra el ciclo de vida del contenido del blog
({EG} DevBlog). No entrega vistas HTML al público; provee recursos JSON para el CMS
(dashboard.html) y alimenta las lecturas del sitio estático (index.html, post.html).

Cumple con:
- Nivel 2 del Modelo de Madurez de Richardson (RMM): URIs de recursos + verbos HTTP
  (GET, POST, PUT, DELETE) + códigos de estado semánticos (200, 201, 304, 404, 409, 422).
- Propiedades HTTP: Idempotencia en GET/PUT/DELETE (DELETE devuelve 200 la primera vez y
  404 en llamadas consecutivas), Seguridad en GET y Caché mediante cabeceras ETag / If-None-Match.
- Modelado y validación de esquemas en español con Pydantic (BaseModel, response_model).
- Parámetros de ruta, parámetros de consulta, Body, Header y Response.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import Body, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Configuración de base de datos SQLite
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DEVBLOG_DB_PATH", str(BASE_DIR / "blog.db")))


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Datos semilla iniciales (tomados del blog real de Erick)
# ---------------------------------------------------------------------------
SEED_POSTS: List[Dict[str, Any]] = [
    {
        "id": "proyecto-devblog",
        "title": "Construyendo mi propio DevBlog: del diseño en Figma al código",
        "kind": "Proyecto",
        "layout": "side",
        "tags": ["HTML/CSS", "JavaScript", "UI/UX", "FastAPI"],
        "image": "assets/images/thumb-design.svg",
        "status": "publicado",
        "date": "2026-11-02T12:00:00",
        "updated_at": "2026-11-02T12:00:00",
        "content": "\n".join(
            [
                "Este es el primer post oficial de mi DevBlog: una plataforma creada desde cero para documentar mis proyectos, prácticas y avances mientras estudio ingeniería.",
                "",
                "## 01. El diseño y la estructura",
                "",
                "Antes de programar definí en Figma las vistas principales sobre una paleta oscura en tonos slate e índigo, separando la lectura pública de mi panel privado de administración.",
                "",
                "- **Feed público:** donde cualquiera puede leer las publicaciones terminadas y filtrarlas por tecnología.",
                "- **Vista de lectura:** artículos completos con bloques de código, imágenes y tabla de contenido.",
                "- **Panel de administrador (CMS):** mi espacio privado conectado a la API REST en FastAPI para publicar avances, editar en caliente y gestionar entradas.",
                "",
                "## 02. Arquitectura con FastAPI, SQLite y Maquetado Modular",
                "",
                "Para que el blog sea rápido y fácil de mantener, organicé los estilos mediante variables CSS y conecté la capa de datos a una API REST construida con FastAPI y SQLite.",
                "",
                "```js store.js",
                "// Crear una nueva publicación desde el CMS hacia la API",
                "Store.create({",
                '  title: "Nuevo avance del proyecto",',
                '  kind: "Proyecto",',
                '  tags: ["HTML/CSS", "JavaScript", "FastAPI"],',
                '  status: "publicado",',
                "});",
                "```",
                "",
                "> **LO QUE APRENDÍ:** Diseñar primero el contrato de la API REST y los componentes en Figma hace que conectar el CMS con el sitio público sea mucho más limpio y ordenado.",
                "",
                "## 03. Próximos pasos",
                "",
                "A partir de aquí iré subiendo mis siguientes prácticas, notas y proyectos directamente desde el panel de administración conectado a la API de este blog.",
            ]
        ),
    }
]

SEED_IDEAS: List[Dict[str, Any]] = [
    {
        "id": "idea-integracion-landing",
        "title": "Conectar portafolio profesional (Landing) con el mismo CMS",
        "content": "Diseñar el segundo servicio de la API para administrar certificaciones, eventos y habilidades desde un panel unificado.",
        "tags": ["FastAPI", "Python", "Arquitectura"],
        "status": "borrador",
        "date": "2026-11-03T10:00:00",
        "updated_at": "2026-11-03T10:00:00",
    }
]

DEFAULT_SITE_CONFIG: Dict[str, Any] = {
    "profile": {
        "name": "Erick",
        "role": "Estudiante de Ingeniería · Dev",
        "bio": "Estudiante de ingeniería construyendo proyectos web.",
        "location": "México",
        "githubUrl": "https://github.com/Z3K-Erick",
        "githubLabel": "GitHub",
    },
    "technologies": ["React", "UI/UX", "Python", "JavaScript", "HTML/CSS", "FastAPI"],
    "projects": [
        {
            "icon": "</>",
            "name": "DevBlog",
            "desc": "Maquetado + CMS y API REST en FastAPI",
        }
    ],
    "avatar": "assets/images/avatar.svg",
}


def init_db() -> None:
    """Crea las tablas en SQLite e inserta los datos iniciales si están vacías."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS publicaciones (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'Proyecto',
                layout TEXT NOT NULL DEFAULT 'side',
                content TEXT NOT NULL,
                tags_json TEXT NOT NULL DEFAULT '[]',
                image TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'publicado',
                date TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ideas (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'borrador',
                date TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS idempotencia (
                idem_key TEXT PRIMARY KEY,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                response_json TEXT NOT NULL,
                created_at REAL NOT NULL
            )
            """
        )

        # Poblar publicaciones iniciales si la tabla está vacía
        count_posts = conn.execute("SELECT COUNT(*) FROM publicaciones").fetchone()[0]
        if count_posts == 0:
            for p in SEED_POSTS:
                conn.execute(
                    """
                    INSERT INTO publicaciones (id, title, kind, layout, content, tags_json, image, status, date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        p["id"],
                        p["title"],
                        p["kind"],
                        p["layout"],
                        p["content"],
                        json.dumps(p["tags"], ensure_ascii=False),
                        p["image"],
                        p["status"],
                        p["date"],
                        p["updated_at"],
                    ),
                )

        # Poblar ideas iniciales si la tabla está vacía
        count_ideas = conn.execute("SELECT COUNT(*) FROM ideas").fetchone()[0]
        if count_ideas == 0:
            for idea in SEED_IDEAS:
                conn.execute(
                    """
                    INSERT INTO ideas (id, title, content, tags_json, status, date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        idea["id"],
                        idea["title"],
                        idea["content"],
                        json.dumps(idea["tags"], ensure_ascii=False),
                        idea["status"],
                        idea["date"],
                        idea["updated_at"],
                    ),
                )

        # Poblar configuración inicial del perfil y barra lateral
        cfg_row = conn.execute(
            "SELECT valor_json FROM configuracion WHERE clave = 'site_config'"
        ).fetchone()
        if cfg_row is None:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "INSERT INTO configuracion (clave, valor_json, updated_at) VALUES (?, ?, ?)",
                ("site_config", json.dumps(DEFAULT_SITE_CONFIG, ensure_ascii=False), now_iso),
            )


# ---------------------------------------------------------------------------
# Utilidades de formato y enriquecimiento
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def generate_id(prefix: str = "p") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def clean_tags(tags: Optional[List[str]]) -> List[str]:
    if not tags:
        return []
    seen = set()
    result = []
    for t in tags:
        clean = str(t).strip().lstrip("#")
        key = clean.lower()
        if clean and key not in seen:
            seen.add(key)
            result.append(clean)
    return result


def compute_read_time(content: str) -> str:
    words = [w for w in str(content or "").strip().split() if w]
    minutes = max(1, round(len(words) / 180))
    return f"{minutes} min de lectura"


def compute_excerpt(content: str, max_len: int = 175) -> str:
    import re

    text = str(content or "").replace("\r\n", "\n")
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    blocks = [
        b.strip()
        for b in re.split(r"\n{2,}", text)
        if b.strip() and not re.match(r"^(#{1,3}\s|>|[-*]\s|\d+\.\s)", b.strip())
    ]
    first = blocks[0] if blocks else ""
    first = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", first)
    first = re.sub(r"[*_`]", "", first)
    first = re.sub(r"\s+", " ", first).strip()
    if len(first) <= max_len:
        return first
    cut = first.rfind(" ", 0, max_len)
    if cut == -1:
        cut = max_len
    return first[:cut].rstrip(",.;:") + "…"


def compute_etag(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()[:16]
    return f'"{digest}"'


def row_to_post(row: sqlite3.Row) -> Dict[str, Any]:
    tags = clean_tags(json.loads(row["tags_json"] or "[]"))
    content = row["content"] or ""
    kind = row["kind"] or "Proyecto"
    return {
        "id": row["id"],
        "title": row["title"],
        "kind": kind,
        "layout": row["layout"] or "side",
        "content": content,
        "tags": tags,
        "category": tags[0] if tags else "General",
        "image": row["image"] or "",
        "status": row["status"] or "publicado",
        "date": row["date"],
        "updatedAt": row["updated_at"],
        "excerpt": compute_excerpt(content),
        "readTime": compute_read_time(content),
        "autor_interno": "erick@devblog.com",  # Atributo interno filtrado por response_model
    }


def row_to_idea(row: sqlite3.Row) -> Dict[str, Any]:
    tags = clean_tags(json.loads(row["tags_json"] or "[]"))
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "tags": tags,
        "status": row["status"] or "borrador",
        "date": row["date"],
        "updatedAt": row["updated_at"],
    }


# ---------------------------------------------------------------------------
# Esquemas Pydantic (Sección 6 del material: In, Interno y Out)
# ---------------------------------------------------------------------------
class PublicacionIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=180, description="Título de la publicación o proyecto")
    content: str = Field(..., min_length=5, description="Contenido en formato Markdown")
    kind: Literal["Proyecto", "Nota", "Guía"] = Field(default="Proyecto", description="Categoría o tipo de post")
    layout: Literal["side", "top"] = Field(default="side", description="Disposición visual de la portada")
    tags: List[str] = Field(default_factory=lambda: ["Proyecto"], description="Lista de tecnologías o etiquetas")
    image: str = Field(default="", description="Ruta o DataURL de la imagen de portada")
    status: Literal["publicado", "borrador"] = Field(default="publicado", description="Estado editorial")

    @field_validator("title", "content")
    @classmethod
    def validar_no_vacio(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El campo no puede estar vacío ni contener solo espacios.")
        return limpio


class PublicacionPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=180)
    content: Optional[str] = Field(default=None, min_length=5)
    kind: Optional[Literal["Proyecto", "Nota", "Guía"]] = None
    layout: Optional[Literal["side", "top"]] = None
    tags: Optional[List[str]] = None
    image: Optional[str] = None
    status: Optional[Literal["publicado", "borrador"]] = None


class PublicacionInterna(BaseModel):
    id: str
    title: str
    kind: str
    layout: str
    content: str
    tags: List[str]
    category: str
    image: str
    status: str
    date: str
    updatedAt: str
    excerpt: str
    readTime: str
    autor_interno: str


class PublicacionOut(BaseModel):
    id: str
    title: str
    kind: str
    layout: str
    content: str
    tags: List[str]
    category: str
    image: str
    status: str
    date: str
    updatedAt: str
    excerpt: str
    readTime: str


class IdeaIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=180, description="Título de la idea")
    content: str = Field(..., min_length=3, description="Descripción o notas de la idea")
    tags: List[str] = Field(default_factory=list, description="Etiquetas asociadas")
    status: Literal["borrador", "publicado"] = Field(default="borrador")

    @field_validator("title", "content")
    @classmethod
    def validar_texto(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El texto no puede estar vacío.")
        return limpio


class IdeaOut(BaseModel):
    id: str
    title: str
    content: str
    tags: List[str]
    status: str
    date: str
    updatedAt: str


class PerfilModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    role: str = Field(default="Estudiante de Ingeniería · Dev")
    bio: str = Field(default="")
    location: str = Field(default="México")
    githubUrl: str = Field(default="https://github.com/Z3K-Erick")
    githubLabel: str = Field(default="GitHub")


class ProyectoConstruccionModel(BaseModel):
    icon: str = Field(default="</>")
    name: str = Field(..., min_length=1)
    desc: str = Field(default="")


class ConfiguracionSitioIn(BaseModel):
    profile: Optional[PerfilModel] = None
    technologies: Optional[List[str]] = None
    projects: Optional[List[ProyectoConstruccionModel]] = None
    avatar: Optional[str] = None


class ConfiguracionSitioOut(BaseModel):
    profile: PerfilModel
    technologies: List[str]
    projects: List[ProyectoConstruccionModel]
    avatar: str


# ---------------------------------------------------------------------------
# Instancia de la aplicación FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="{EG} DevBlog — API REST de Administración de Contenido (CMS)",
    description=(
        "Servicio REST desarrollado con FastAPI y SQLite para administrar las publicaciones, "
        "proyectos, ideas y configuración de perfil de {EG} DevBlog. "
        "Diseñado bajo el Nivel 2 del Modelo de Madurez de Richardson (RMM)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag", "X-CMS-Service", "X-Idempotent-Replay"],
)

init_db()


# ---------------------------------------------------------------------------
# Manejo de errores de validación en español
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errores = []
    for err in exc.errors():
        campo = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        msg = err.get("msg", "Valor inválido")
        tipo = err.get("type", "")
        if "string_too_short" in tipo:
            msg = f"El campo '{campo}' es demasiado corto."
        elif "missing" in tipo:
            msg = f"El campo '{campo}' es obligatorio."
        elif "literal_error" in tipo:
            msg = f"El campo '{campo}' tiene un valor no permitido."
        errores.append({"campo": campo, "mensaje": msg})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Error de validación en los datos enviados.",
            "errores": errores,
        },
    )


def check_idempotency(idem_key: Optional[str], method: str, path: str) -> Optional[JSONResponse]:
    if not idem_key:
        return None
    with get_db() as conn:
        row = conn.execute(
            "SELECT status_code, response_json, created_at FROM idempotencia WHERE idem_key = ? AND method = ? AND path = ?",
            (idem_key, method, path),
        ).fetchone()
        if row and (time.time() - row["created_at"]) < 86400:
            return JSONResponse(
                status_code=row["status_code"],
                content=json.loads(row["response_json"]),
                headers={"X-Idempotent-Replay": "true", "X-CMS-Service": "DevBlog-API-v1"},
            )
    return None


def save_idempotency(idem_key: Optional[str], method: str, path: str, status_code: int, payload: Any) -> None:
    if not idem_key:
        return
    with get_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO idempotencia (idem_key, method, path, status_code, response_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (idem_key, method, path, status_code, json.dumps(payload, ensure_ascii=False), time.time()),
        )


# ---------------------------------------------------------------------------
# 1. Endpoint de saludo y estado del servicio (Sección 1 de la guía FastAPI)
# ---------------------------------------------------------------------------
@app.get("/saludo", tags=["Estado del Servicio"])
def saludar_servicio(response: Response):
    """Comprueba que el servidor ASGI (Uvicorn) y la API del Blog están activos."""
    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return {
        "servicio": "cms-blog-api",
        "estado": "activo",
        "mensaje": "API de {EG} DevBlog lista en puerto 8001",
    }


# ---------------------------------------------------------------------------
# 2. Verificación de cabeceras HTTP (Sección 5 de la guía FastAPI: Header)
# ---------------------------------------------------------------------------
@app.get("/verificar-cliente", tags=["Estado del Servicio"])
def verificar_cliente(
    x_cms_cliente: str = Header(default="Consola-Web-DevBlog"),
    user_agent: str = Header(default="Desconocido"),
):
    """Inspecciona y normaliza las cabeceras HTTP enviadas por el cliente o CMS."""
    return {
        "cliente_cms": x_cms_cliente,
        "agente_usuario": user_agent,
        "servicio": "DevBlog-API-v1",
    }


# ---------------------------------------------------------------------------
# 3. Endpoints principales de Publicaciones / Proyectos (/proyectos y /publicaciones)
# ---------------------------------------------------------------------------
@app.get(
    "/proyectos",
    response_model=List[PublicacionOut],
    tags=["Proyectos y Publicaciones"],
)
@app.get(
    "/publicaciones",
    response_model=List[PublicacionOut],
    tags=["Proyectos y Publicaciones"],
)
def listar_proyectos(
    response: Response,
    estado: Optional[str] = Query(default=None, description="Filtrar por estado: publicado o borrador"),
    kind: Optional[str] = Query(default=None, description="Filtrar por categoría: Proyecto, Nota, Guía"),
    tag: Optional[str] = Query(default=None, description="Filtrar por etiqueta tecnológica"),
    q: Optional[str] = Query(default=None, description="Texto a buscar en título o contenido"),
    if_none_match: Optional[str] = Header(default=None),
):
    """
    Devuelve la lista de publicaciones/proyectos registrados en el blog.
    Soporta filtrado por parámetros de consulta y almacenamiento en caché con ETag.
    """
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM publicaciones ORDER BY date DESC").fetchall()

    items = [row_to_post(r) for r in rows]

    if estado and estado.lower() not in ("todos", "all"):
        items = [p for p in items if p["status"].lower() == estado.lower()]
    if kind and kind.lower() not in ("todas", "todos", "all"):
        items = [p for p in items if p["kind"].lower() == kind.lower()]
    if tag and tag.lower() not in ("todos", "all"):
        items = [p for p in items if any(t.lower() == tag.lower() for t in p["tags"])]
    if q:
        term = q.strip().lower()
        items = [
            p
            for p in items
            if term in p["title"].lower()
            or term in p["content"].lower()
            or any(term in t.lower() for t in p["tags"])
        ]

    # Filtramos los campos públicos para calcular el ETag consistente
    public_items = [PublicacionOut(**p).model_dump() for p in items]
    etag = compute_etag(public_items)

    if if_none_match and if_none_match == etag:
        return Response(status_code=status.HTTP_304_NOT_FOUND if hasattr(status, "HTTP_304_NOT_FOUND") else 304, headers={"ETag": etag})

    response.headers["ETag"] = etag
    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return [PublicacionInterna(**p) for p in items]


@app.get(
    "/proyectos/buscar",
    response_model=List[PublicacionOut],
    tags=["Proyectos y Publicaciones"],
)
def buscar_proyectos(
    q: str = Query(default="", description="Palabra clave a buscar en título, extracto o etiquetas"),
    kind: Optional[str] = Query(default=None, description="Tipo de publicación: Proyecto, Nota o Guía"),
    estado: Optional[str] = Query(default=None, description="Estado: publicado o borrador"),
):
    """Búsqueda dedicada mediante parámetros de consulta (Sección 3 de la guía FastAPI)."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM publicaciones ORDER BY date DESC").fetchall()

    items = [row_to_post(r) for r in rows]
    if q.strip():
        term = q.strip().lower()
        items = [
            p
            for p in items
            if term in p["title"].lower()
            or term in p["content"].lower()
            or any(term in t.lower() for t in p["tags"])
        ]
    if kind:
        items = [p for p in items if p["kind"].lower() == kind.lower()]
    if estado:
        items = [p for p in items if p["status"].lower() == estado.lower()]

    return [PublicacionInterna(**p) for p in items]


@app.get(
    "/proyectos/{id_}",
    response_model=PublicacionOut,
    tags=["Proyectos y Publicaciones"],
)
@app.get(
    "/publicaciones/{id_}",
    response_model=PublicacionOut,
    tags=["Proyectos y Publicaciones"],
)
def obtener_proyecto_individual(
    id_: str,
    response: Response,
    if_none_match: Optional[str] = Header(default=None),
):
    """
    Obtiene el detalle completo de un proyecto o publicación mediante su parámetro de ruta {id_}.
    Devuelve 404 si el identificador no existe.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM publicaciones WHERE id = ?", (id_,)).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La publicación con ID '{id_}' no existe.",
        )

    post_data = row_to_post(row)
    public_data = PublicacionOut(**post_data).model_dump()
    etag = compute_etag(public_data)

    if if_none_match and if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag})

    response.headers["ETag"] = etag
    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return PublicacionInterna(**post_data)


@app.post(
    "/proyectos",
    response_model=PublicacionOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Proyectos y Publicaciones"],
)
@app.post(
    "/publicaciones",
    response_model=PublicacionOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Proyectos y Publicaciones"],
)
def crear_proyecto(
    datos: PublicacionIn,
    response: Response,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    """
    Crea una nueva publicación o proyecto en la base de datos del blog.
    Emite código 201 (Created), cabecera personalizada y soporta Idempotency-Key.
    """
    cached = check_idempotency(idempotency_key, "POST", "/proyectos")
    if cached:
        return cached

    tags = clean_tags(datos.tags) or ["Proyecto"]
    timestamp = now_iso()
    new_id = generate_id("p")

    with get_db() as conn:
        # Verificar conflicto de título idéntico si se requiere evitar duplicados accidentales
        conn.execute(
            """
            INSERT INTO publicaciones (id, title, kind, layout, content, tags_json, image, status, date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id,
                datos.title,
                datos.kind,
                datos.layout,
                datos.content,
                json.dumps(tags, ensure_ascii=False),
                datos.image,
                datos.status,
                timestamp,
                timestamp,
            ),
        )
        row = conn.execute("SELECT * FROM publicaciones WHERE id = ?", (new_id,)).fetchone()

    post_data = row_to_post(row)
    out_data = PublicacionOut(**post_data).model_dump()
    save_idempotency(idempotency_key, "POST", "/proyectos", status.HTTP_201_CREATED, out_data)

    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    response.headers["ETag"] = compute_etag(out_data)
    return PublicacionInterna(**post_data)


@app.post(
    "/proyectos/registro-simple",
    status_code=status.HTTP_201_CREATED,
    tags=["Proyectos y Publicaciones"],
)
def registrar_proyecto_simple(
    response: Response,
    title: str = Body(..., embed=True),
    content: str = Body(..., embed=True),
    kind: str = Body(default="Proyecto", embed=True),
    status_post: str = Body(default="borrador", alias="status", embed=True),
):
    """
    Alta directa mediante Body(embed=True) (Sección 4 de la guía FastAPI).
    """
    if len(title.strip()) < 3 or len(content.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El título debe tener al menos 3 caracteres y el contenido al menos 5.",
        )
    timestamp = now_iso()
    new_id = generate_id("p")
    estado_valido = "borrador" if status_post == "borrador" else "publicado"
    kind_valido = kind if kind in ("Proyecto", "Nota", "Guía") else "Proyecto"

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO publicaciones (id, title, kind, layout, content, tags_json, image, status, date, updated_at)
            VALUES (?, ?, ?, 'side', ?, ?, '', ?, ?, ?)
            """,
            (
                new_id,
                title.strip(),
                kind_valido,
                content.strip(),
                json.dumps([kind_valido], ensure_ascii=False),
                estado_valido,
                timestamp,
                timestamp,
            ),
        )
        row = conn.execute("SELECT * FROM publicaciones WHERE id = ?", (new_id,)).fetchone()

    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return PublicacionOut(**row_to_post(row))


@app.put(
    "/proyectos/{id_}",
    response_model=PublicacionOut,
    tags=["Proyectos y Publicaciones"],
)
@app.put(
    "/publicaciones/{id_}",
    response_model=PublicacionOut,
    tags=["Proyectos y Publicaciones"],
)
def actualizar_proyecto(
    id_: str,
    datos: PublicacionPatch,
    response: Response,
):
    """
    Actualiza una publicación existente por su ID. Es una operación idempotente:
    aplicar los mismos datos múltiples veces deja el recurso en el mismo estado.
    Devuelve 404 si el ID no existe.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM publicaciones WHERE id = ?", (id_,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La publicación con ID '{id_}' no existe.",
            )

        current = row_to_post(row)
        next_title = datos.title.strip() if datos.title is not None else current["title"]
        next_content = datos.content.strip() if datos.content is not None else current["content"]
        next_kind = datos.kind if datos.kind is not None else current["kind"]
        next_layout = datos.layout if datos.layout is not None else current["layout"]
        next_tags = clean_tags(datos.tags) if datos.tags is not None else current["tags"]
        if not next_tags:
            next_tags = ["Proyecto"]
        next_image = datos.image if datos.image is not None else current["image"]
        next_status = datos.status if datos.status is not None else current["status"]
        updated_at = now_iso()

        conn.execute(
            """
            UPDATE publicaciones
            SET title = ?, kind = ?, layout = ?, content = ?, tags_json = ?, image = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                next_title,
                next_kind,
                next_layout,
                next_content,
                json.dumps(next_tags, ensure_ascii=False),
                next_image,
                next_status,
                updated_at,
                id_,
            ),
        )
        updated_row = conn.execute("SELECT * FROM publicaciones WHERE id = ?", (id_,)).fetchone()

    post_data = row_to_post(updated_row)
    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    response.headers["ETag"] = compute_etag(PublicacionOut(**post_data).model_dump())
    return PublicacionInterna(**post_data)


@app.delete(
    "/proyectos/{id_}",
    tags=["Proyectos y Publicaciones"],
)
@app.delete(
    "/publicaciones/{id_}",
    tags=["Proyectos y Publicaciones"],
)
def eliminar_proyecto(id_: str, response: Response):
    """
    Elimina físicamente una publicación de la base de datos.
    Cumple con el comportamiento de idempotencia del PDF de REST:
    la primera petición DELETE responde HTTP 200 (OK) confirmando el borrado,
    y cualquier petición DELETE consecutiva al mismo ID responde HTTP 404 (Not Found).
    """
    with get_db() as conn:
        row = conn.execute("SELECT id, title FROM publicaciones WHERE id = ?", (id_,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La publicación con ID '{id_}' no existe o ya fue eliminada.",
            )
        conn.execute("DELETE FROM publicaciones WHERE id = ?", (id_,))

    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return {
        "eliminado": True,
        "id": id_,
        "title": row["title"],
        "mensaje": "Publicación eliminada correctamente.",
    }


# ---------------------------------------------------------------------------
# 4. Gestión de Ideas en borrador (/ideas)
# ---------------------------------------------------------------------------
@app.get("/ideas", response_model=List[IdeaOut], tags=["Ideas"])
def listar_ideas(response: Response, if_none_match: Optional[str] = Header(default=None)):
    """Lista todas las ideas registradas en el CMS."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM ideas ORDER BY date DESC").fetchall()
    items = [row_to_idea(r) for r in rows]
    etag = compute_etag(items)
    if if_none_match and if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag})
    response.headers["ETag"] = etag
    return items


@app.post("/ideas", response_model=IdeaOut, status_code=status.HTTP_201_CREATED, tags=["Ideas"])
def crear_idea(datos: IdeaIn, response: Response):
    """Crea una nueva idea rápida en el CMS."""
    new_id = generate_id("idea")
    timestamp = now_iso()
    tags = clean_tags(datos.tags)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO ideas (id, title, content, tags_json, status, date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id, datos.title, datos.content, json.dumps(tags, ensure_ascii=False), datos.status, timestamp, timestamp),
        )
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (new_id,)).fetchone()
    response.headers["X-CMS-Service"] = "DevBlog-API-v1"
    return row_to_idea(row)


@app.get("/ideas/{id_}", response_model=IdeaOut, tags=["Ideas"])
def obtener_idea(id_: str, response: Response):
    """Obtiene una idea específica por su ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (id_,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"La idea con ID '{id_}' no existe.")
    item = row_to_idea(row)
    response.headers["ETag"] = compute_etag(item)
    return item


@app.put("/ideas/{id_}", response_model=IdeaOut, tags=["Ideas"])
def reemplazar_idea(id_: str, datos: IdeaIn):
    """Actualiza por completo una idea existente."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (id_,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"La idea con ID '{id_}' no existe.")
        updated_at = now_iso()
        tags = clean_tags(datos.tags)
        conn.execute(
            """
            UPDATE ideas
            SET title = ?, content = ?, tags_json = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (datos.title, datos.content, json.dumps(tags, ensure_ascii=False), datos.status, updated_at, id_),
        )
        updated = conn.execute("SELECT * FROM ideas WHERE id = ?", (id_,)).fetchone()
    return row_to_idea(updated)


@app.delete("/ideas/{id_}", tags=["Ideas"])
def eliminar_idea(id_: str):
    """Elimina una idea por su ID (200 la primera vez, 404 si ya no existe)."""
    with get_db() as conn:
        row = conn.execute("SELECT id, title FROM ideas WHERE id = ?", (id_,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"La idea con ID '{id_}' no existe.")
        conn.execute("DELETE FROM ideas WHERE id = ?", (id_,))
    return {"eliminado": True, "id": id_, "title": row["title"]}


# ---------------------------------------------------------------------------
# 5. Configuración del Perfil y Barra Lateral del Blog (/configuracion y /perfil)
# ---------------------------------------------------------------------------
def read_site_config() -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT valor_json FROM configuracion WHERE clave = 'site_config'"
        ).fetchone()
    if not row:
        return dict(DEFAULT_SITE_CONFIG)
    data = json.loads(row["valor_json"])
    return {
        "profile": {**DEFAULT_SITE_CONFIG["profile"], **(data.get("profile") or {})},
        "technologies": data.get("technologies") or list(DEFAULT_SITE_CONFIG["technologies"]),
        "projects": data.get("projects") or list(DEFAULT_SITE_CONFIG["projects"]),
        "avatar": data.get("avatar") or DEFAULT_SITE_CONFIG["avatar"],
    }


@app.get("/configuracion", response_model=ConfiguracionSitioOut, tags=["Perfil y Configuración"])
@app.get("/perfil", response_model=ConfiguracionSitioOut, tags=["Perfil y Configuración"])
def obtener_configuracion(response: Response):
    """Devuelve la información del perfil del autor, tecnologías de filtro y proyectos en construcción."""
    cfg = read_site_config()
    response.headers["ETag"] = compute_etag(cfg)
    return cfg


@app.put("/configuracion", response_model=ConfiguracionSitioOut, tags=["Perfil y Configuración"])
@app.put("/perfil", response_model=ConfiguracionSitioOut, tags=["Perfil y Configuración"])
def actualizar_configuracion(datos: ConfiguracionSitioIn, response: Response):
    """Actualiza el perfil del autor, las etiquetas tecnológicas o la lista 'En construcción'."""
    current = read_site_config()
    if datos.profile is not None:
        current["profile"] = datos.profile.model_dump()
    if datos.technologies is not None:
        current["technologies"] = clean_tags(datos.technologies)
    if datos.projects is not None:
        current["projects"] = [p.model_dump() for p in datos.projects]
    if datos.avatar is not None:
        current["avatar"] = datos.avatar or DEFAULT_SITE_CONFIG["avatar"]

    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO configuracion (clave, valor_json, updated_at) VALUES (?, ?, ?)",
            ("site_config", json.dumps(current, ensure_ascii=False), now_iso()),
        )

    response.headers["ETag"] = compute_etag(current)
    return current


# ---------------------------------------------------------------------------
# 6. Exportación de contenido publicado (Pipeline estático)
# ---------------------------------------------------------------------------
@app.get("/exportar", tags=["Exportación Pública"])
def exportar_contenido_publicado(response: Response):
    """
    Exporta en un solo paquete JSON únicamente los posts publicados y la configuración
    pública del sitio para alimentar al sitio estático de visitantes.
    """
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM publicaciones WHERE status = 'publicado' ORDER BY date DESC"
        ).fetchall()
    posts = [PublicacionOut(**row_to_post(r)).model_dump() for r in rows]
    cfg = read_site_config()
    payload = {
        "generado_en": now_iso(),
        "total_publicados": len(posts),
        "publicaciones": posts,
        "configuracion": cfg,
    }
    response.headers["ETag"] = compute_etag(payload)
    return payload


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_blog:app", host="127.0.0.1", port=8001, reload=True)
