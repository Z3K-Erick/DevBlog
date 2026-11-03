# {EG} DevBlog — Maquetado Frontend (HTML, CSS y JS)

Maquetado web en **HTML5, CSS3 y JavaScript**, diseñado sobre una paleta oscura *slate* (azul medianoche) con acentos en índigo (`#6366f1`) y cian (`#22d3ee`), e integrando el logotipo interactivo **`{EG}`** (cuyos colores cian y blanco se invierten al pasar el cursor).

---

## 🖥️ Vistas y Modales del Proyecto

1. **Pantalla 1 — El Feed Principal ([`index.html`](file:///c:/Users/erick/OneDrive/Desktop/DevBlog/index.html))**:
   - Barra superior con logo `{EG}`, navegación, buscador, **botón invisible junto a la foto de perfil** y foto de perfil circular.
   - Diseño en dos columnas: a la izquierda, el muro de tarjetas de publicaciones (con etiquetas de categoría, fecha, título y resumen); a la derecha, la barra lateral con perfil, botón a GitHub, filtros por tecnología (`React`, `UI/UX`, `Python`, `JavaScript`, `HTML/CSS`, `FastAPI`) y sección *En construcción*.

2. **Pantalla 2 — Lectura Completa / El Hilo ([`post.html`](file:///c:/Users/erick/OneDrive/Desktop/DevBlog/post.html))**:
   - Vista dedicada del artículo con formato, bloques de código con numeración de líneas, resaltado de sintaxis y botón `Copiar`, capturas con marco de ventana, bloque `LO QUE APRENDÍ`, enlace al repositorio e índice lateral interactivo (*En este artículo*).
   - Incluye enlace `← Volver al feed`.

3. **Pantalla 3 — Dashboard Privado: Pestaña "Mi Feed" ([`dashboard.html`](file:///c:/Users/erick/OneDrive/Desktop/DevBlog/dashboard.html))**:
   - **Caja de publicación rápida:** formulario superior para escribir el título, qué estás construyendo, etiquetas e imagen, con botones `Guardar como borrador` y `+ Publicar avance`.
   - **Edición en caliente:** cada tarjeta cuenta con botones `Editar` y `Eliminar`. Al hacer clic en `Editar`, la tarjeta misma se convierte en campos editables con botones `Guardar` y `Cancelar` sin salir de la página.

4. **Pantalla 4 — Dashboard Privado: Pestaña "Gestor de Publicaciones" ([`dashboard.html#gestor`](file:///c:/Users/erick/OneDrive/Desktop/DevBlog/dashboard.html))**:
   - Vista de tabla con buscador y filtros por estado (`Todos`, `Publicados`, `Borradores`) y categoría.
   - Columnas: *Título del post*, *Categoría*, *Fecha de creación*, *Estado* (indicador verde para `Publicado`, naranja para `Borrador`) y *Acciones* (`Editar` / `Borrar`).

5. **Componentes Modales ([`js/ui.js`](file:///c:/Users/erick/OneDrive/Desktop/DevBlog/js/ui.js))**:
   - **Modal de Login (`Iniciar Sesión`):** se abre desde el botón invisible ubicado junto a la foto de perfil. Valida las credenciales del administrador único antes de permitir el acceso al Dashboard.
   - **Modal de Eliminación (`¿Eliminar publicación?`):** alerta flotante con confirmación en rojo (`Sí, eliminar`) o `Cancelar` antes de borrar cualquier post.

---

## ⚙️ API REST del Blog (`api_blog.py`) y Conexión con el CMS (`dashboard.html`)

El proyecto incluye una **API REST en FastAPI + SQLite** que administra el ciclo de vida del contenido desde el panel de administración (`dashboard.html` actuando como CMS) y alimenta las lecturas del sitio estático (`index.html` y `post.html`).

### 🚀 Cómo ejecutar todo el entorno

1. Instalar las dependencias de Python:
   ```bash
   python -m pip install -r requirements.txt
   ```
2. Iniciar el servidor unificado (levanta la API en el puerto `8001` y el servidor web en el `8080`):
   ```bash
   python run.py
   ```
   *(O bien iniciar únicamente la API con `python -m uvicorn api_blog:app --port 8001 --reload`)*
3. Accesos locales:
   - **Blog público:** `http://127.0.0.1:8080/index.html`
   - **CMS / Dashboard de Administración:** `http://127.0.0.1:8080/dashboard.html`
   - **API REST del Blog:** `http://127.0.0.1:8001/proyectos`
   - **Documentación interactiva (Swagger UI):** `http://127.0.0.1:8001/docs`

### 📌 Endpoints principales (`http://127.0.0.1:8001`)

| Método | Ruta | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/proyectos` (o `/publicaciones`) | Lista publicaciones con filtros opcionales (`?estado=`, `?kind=`, `?tag=`, `?q=`) y caché `ETag`. | `200`, `304` |
| `POST` | `/proyectos` (o `/publicaciones`) | Crea una nueva publicación validada con Pydantic y soporte de `Idempotency-Key`. | `201`, `422` |
| `GET` | `/proyectos/{id_}` | Obtiene el detalle completo de una publicación por su ID en la ruta. | `200`, `304`, `404` |
| `PUT` | `/proyectos/{id_}` | Actualiza de forma síncrona e idempotente una publicación existente. | `200`, `404`, `422` |
| `DELETE` | `/proyectos/{id_}` | Elimina físicamente una publicación (`200` la primera vez, `404` en llamadas repetidas). | `200`, `404` |
| `GET` | `/proyectos/buscar` | Búsqueda mediante parámetros de consulta (`?q=`, `?kind=`, `?estado=`). | `200` |
| `CRUD` | `/ideas` y `/ideas/{id_}` | Gestión CRUD completa de ideas en borrador dentro del CMS. | `200`, `201`, `404`, `422` |
| `GET/PUT` | `/configuracion` (o `/perfil`) | Obtiene o reemplaza los datos del perfil del autor, tecnologías y sección *En construcción*. | `200`, `422` |
| `GET` | `/exportar` | Exporta como JSON el contenido con estado `publicado` y la configuración del sitio. | `200` |

### 🧪 Ejecutar las pruebas automatizadas

```bash
python -m pytest test_api_blog.py -v
```

