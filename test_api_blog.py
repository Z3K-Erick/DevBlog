"""
Pruebas automatizadas de la API REST del Blog ({EG} DevBlog).
Verifica todos los conceptos del material de FastAPI y de Arquitectura REST:
1. Saludo y cabeceras personalizadas (Response).
2. Parámetros de ruta (/proyectos/{id_}) y manejo de 404.
3. Parámetros de consulta (/proyectos/buscar, /proyectos?estado=...).
4. Cuerpo JSON con Pydantic (POST /proyectos) y Body(embed=True) (/proyectos/registro-simple).
5. Inyección y normalización de cabeceras (Header en /verificar-cliente e Idempotency-Key).
6. Filtrado de esquemas con response_model (ocultamiento de autor_interno).
7. Códigos de estado HTTP (200, 201, 304 con ETag, 404, 422 en español).
8. Idempotencia de DELETE (200 en la primera llamada, 404 en la segunda).
9. CRUD de /ideas y /configuracion (/perfil).
"""

import os
import tempfile
from pathlib import Path

# Usar una base de datos temporal aislada para las pruebas
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["DEVBLOG_DB_PATH"] = _tmp_db.name

from fastapi.testclient import TestClient
import api_blog

api_blog.DB_PATH = Path(_tmp_db.name)
api_blog.init_db()

client = TestClient(api_blog.app)


def test_01_saludo_y_cabeceras_respuesta():
    r = client.get("/saludo")
    assert r.status_code == 200
    assert r.headers.get("X-CMS-Service") == "DevBlog-API-v1"
    data = r.json()
    assert data["estado"] == "activo"


def test_02_verificar_cabeceras_header():
    r = client.get("/verificar-cliente", headers={"X-CMS-Cliente": "Dashboard-Erick"})
    assert r.status_code == 200
    assert r.json()["cliente_cms"] == "Dashboard-Erick"


def test_03_listar_proyectos_iniciales_y_etag():
    r = client.get("/proyectos")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert "autor_interno" not in items[0]  # Filtrado por response_model=PublicacionOut
    etag = r.headers.get("ETag")
    assert etag is not None

    # Segunda petición con If-None-Match debe responder 304 Not Modified
    r_cache = client.get("/proyectos", headers={"If-None-Match": etag})
    assert r_cache.status_code == 304


def test_04_crear_proyecto_201_e_idempotencia():
    payload = {
        "title": "Implementación de API REST con FastAPI y SQLite",
        "content": "Documentación paso a paso de la conexión entre el CMS y el blog.",
        "kind": "Proyecto",
        "layout": "side",
        "tags": ["FastAPI", "Python", "SQLite"],
        "status": "publicado",
    }
    headers = {"Idempotency-Key": "idem-test-001"}
    r1 = client.post("/proyectos", json=payload, headers=headers)
    assert r1.status_code == 201
    creado = r1.json()
    assert creado["title"] == payload["title"]
    assert "autor_interno" not in creado

    # Reintento con la misma Idempotency-Key devuelve la misma respuesta sin duplicar
    r2 = client.post("/proyectos", json=payload, headers=headers)
    assert r2.status_code == 201
    assert r2.headers.get("X-Idempotent-Replay") == "true"
    assert r2.json()["id"] == creado["id"]


def test_05_obtener_proyecto_por_id_y_404():
    r_ok = client.get("/proyectos/proyecto-devblog")
    assert r_ok.status_code == 200
    assert r_ok.json()["id"] == "proyecto-devblog"

    r_404 = client.get("/proyectos/id-inexistente-999")
    assert r_404.status_code == 404


def test_06_buscar_con_parametros_de_consulta():
    r = client.get("/proyectos/buscar", params={"q": "FastAPI", "kind": "Proyecto"})
    assert r.status_code == 200
    resultados = r.json()
    assert len(resultados) >= 1


def test_07_registro_simple_body_embed():
    r = client.post(
        "/proyectos/registro-simple",
        json={
            "title": "Nota rápida desde Body embed",
            "content": "Contenido de prueba enviado con Body(embed=True).",
            "kind": "Nota",
            "status": "borrador",
        },
    )
    assert r.status_code == 201
    assert r.json()["kind"] == "Nota"
    assert r.json()["status"] == "borrador"


def test_08_validacion_en_espanol_422():
    r = client.post("/proyectos", json={"title": "A", "content": ""})
    assert r.status_code == 422
    body = r.json()
    assert "errores" in body


def test_09_actualizar_put_y_eliminar_delete_idempotente():
    # Crear post temporal
    r_create = client.post(
        "/proyectos",
        json={
            "title": "Post temporal para borrar",
            "content": "Contenido temporal para probar PUT y DELETE.",
            "kind": "Guía",
            "status": "borrador",
        },
    )
    post_id = r_create.json()["id"]

    # Actualizar con PUT
    r_put = client.put(
        f"/proyectos/{post_id}",
        json={"title": "Post actualizado con PUT", "status": "publicado"},
    )
    assert r_put.status_code == 200
    assert r_put.json()["title"] == "Post actualizado con PUT"
    assert r_put.json()["status"] == "publicado"

    # Eliminar con DELETE: primera vez responde 200, segunda vez responde 404
    r_del_1 = client.delete(f"/proyectos/{post_id}")
    assert r_del_1.status_code == 200
    assert r_del_1.json()["eliminado"] is True

    r_del_2 = client.delete(f"/proyectos/{post_id}")
    assert r_del_2.status_code == 404


def test_10_crud_ideas_y_configuracion():
    r_idea = client.post(
        "/ideas",
        json={"title": "Nueva idea de artículo", "content": "Hablar sobre modelos de madurez RMM."},
    )
    assert r_idea.status_code == 201
    idea_id = r_idea.json()["id"]

    r_list = client.get("/ideas")
    assert r_list.status_code == 200
    assert any(i["id"] == idea_id for i in r_list.json())

    r_del = client.delete(f"/ideas/{idea_id}")
    assert r_del.status_code == 200
    assert client.delete(f"/ideas/{idea_id}").status_code == 404

    # Configuración / Perfil
    r_cfg = client.get("/configuracion")
    assert r_cfg.status_code == 200
    assert r_cfg.json()["profile"]["name"] == "Erick"


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
