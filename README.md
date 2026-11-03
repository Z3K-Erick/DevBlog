# 🚀 DevBlog — Maquetado Frontend (HTML5, CSS3, JS)

Maquetado moderno, modular y responsivo para blog de tecnología y desarrollo web, basado fielmente en el diseño de Figma y preparado para escalarse a producción o conectarse con cualquier backend / CMS.

---

## 🎨 Vistas Implementadas (Figma Mockups)

1. **Página de Inicio / Feed (`index.html`)**:
   - Cabecera con logotipo, barra de búsqueda en tiempo real, menú de navegación y botón de login.
   - Hero banner *"Aprender. Construir. Compartir."* con filtros rápidos por tecnología.
   - Tarjeta destacada (*Featured Card*) con banner conceptual de tablero Kanban, badges y resumen.
   - Grilla de publicaciones recientes con filtrado interactivo por etiquetas y categorías.
   - Barra lateral con ficha de autor ("Erick"), nube de temas populares y publicaciones destacadas.
   - Paginación dinámica (*Cargar más publicaciones*).

2. **Detalle de Artículo (`post.html`)**:
   - Botón de regreso al feed.
   - Encabezado con etiquetas, título, autor, fecha y tiempo estimado de lectura.
   - Secciones numeradas (`01. Paso a paso por la estructura`, `02. Usando React...`, `03. Lo siguiente...`).
   - Ilustraciones y capturas responsivas con pie de figura.
   - Bloque de código interactivo con identificador de archivo (`KanbanBoard.jsx`) y botón para copiar código al portapapeles en 1 clic.
   - Cajas de tips y notas de rendimiento (*Callout boxes*).
   - Barra lateral flotante con **Tabla de Contenidos interactiva (TOC)** y *ScrollSpy*, además de botones para compartir en Twitter/X, LinkedIn y copiar enlace.

3. **Gestor de Publicaciones / Panel Admin (`admin.html`)**:
   - Barra lateral de administración fija y responsiva con accesos directos.
   - Resumen de métricas: Total de artículos, Publicados y Borradores.
   - Barra de herramientas con buscador en tiempo real y selector de estado (*Todos / Publicados / Borradores*).
   - Tabla interactiva con títulos, categorías, fechas, badges de estado y botones de acción (*Ver*, *Editar*, *Eliminar*).
   - **Modal de confirmación:** "¿Eliminar publicación?" con backdrop desenfocado y confirmación destructiva.

4. **Editor de Publicaciones (`editor.html`)**:
   - Generación automática de slugs en tiempo real a partir del título.
   - Selector de categoría, tiempo de lectura y URL de imagen de portada.
   - Gestor interactivo de etiquetas (*Tags*) con agregado mediante la tecla Enter y eliminación directa.
   - Barra de herramientas con atajos Markdown/HTML (Negrita, Cursiva, Encabezados H2/H3, Código, Citas, Tips, Enlaces, Listas).
   - Vista previa en tiempo real sincronizada.
   - Botones para guardar como *Borrador* o *Publicar directamente*.

---

## 📂 Estructura de Archivos

```
DevBlog/
├── index.html              # Feed principal y portal del blog
├── post.html               # Vista de lectura de artículos (?id=... o ?slug=...)
├── admin.html              # Panel Gestor CRUD de publicaciones
├── editor.html             # Editor y redactor con vista previa
├── css/
│   ├── style.css           # Tokens de diseño, Dark Theme, layout y tipografía
│   ├── components.css      # Botones, badges, modales, formularios, tablas y toasts
│   ├── blog.css            # Estilos del feed, featured card, sidebar y post individual
│   └── admin.css           # Estilos del dashboard administrativo y editor
├── js/
│   ├── store.js            # Capa de datos con persistencia en localStorage
│   ├── main.js             # Lógica global (búsqueda, modales, toast, feed)
│   ├── post.js             # Lógica de lectura (ScrollSpy TOC, copy code, share)
│   ├── admin.js            # Lógica del gestor (tabla, filtros, métricas, modal delete)
│   └── editor.js           # Lógica del editor (markdown, slug, tags, live preview)
├── assets/
│   └── images/
│       ├── logo.svg            # Isotipo DevBlog
│       ├── avatar.svg          # Avatar vectorial del autor
│       ├── kanban-preview.svg  # Mockup vectorial del tablero Kanban
│       ├── thumb-design.svg    # Thumbnail de diseño UI/UX
│       └── thumb-react.svg     # Thumbnail de React Hooks
└── README.md
```

---

## 🛠️ Tecnologías y Características

- **Sin dependencias externas pesadas:** Funciona directamente abriendo cualquier archivo `.html` en cualquier navegador moderno.
- **Persistencia con `localStorage`:** Puedes crear un artículo en `editor.html`, verlo en `admin.html`, y leerlo en `post.html` o en `index.html` sin necesidad de configurar una base de datos todavía.
- **Diseño 100% Responsivo:** Adaptado para teléfonos móviles, tablets y monitores de escritorio.
- **Tokens de color consistentes:** Basados en la estética Dark Developer de Figma (`#0a0f1d`, `#151d30`, `#6366f1`, `#06b6d4`, `#10b981`).
