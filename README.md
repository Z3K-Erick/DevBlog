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
