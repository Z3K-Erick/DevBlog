/**
 * DevBlog — Capa de datos y autenticación
 * ---------------------------------------------------------------
 * - Store: CRUD de publicaciones persistido en localStorage.
 * - Auth:  login estático en el frontend que guarda isAdmin = true
 *          en localStorage.
 *
 * Los posts de SEED_POSTS son únicamente datos de muestra del
 * maquetado; después se pueden borrar o reemplazar desde el panel.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'devblog:posts:v3';
  const AUTH_KEY = 'isAdmin';

  // Credenciales quemadas en el frontend para el alcance del proyecto
  const CREDENTIALS = {
    users: ['erick', 'erick@devblog.com', 'erick@devblog.dev', 'admin'],
    passwords: ['devblog123', '123456', 'admin123'],
  };

  /* ---------------------------------------------------------------
   * Utils
   * ------------------------------------------------------------- */
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function slugify(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const dateFormatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function formatDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date).replace('.', '');
  }

  function readTime(content) {
    const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(3, Math.round(words / 180))} min de lectura`;
  }

  function makeExcerpt(content, max = 175) {
    const blocks = String(content || '')
      .replace(/\r\n?/g, '\n')
      .replace(/```[\s\S]*?```/g, '')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b && !/^(#{1,3}\s|!\[|>|[-*]\s|\d+\.\s)/.test(b));

    const text = (blocks[0] || '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= max) return text;
    return text.slice(0, text.lastIndexOf(' ', max)).replace(/[,.;:]$/, '') + '…';
  }

  function uid() {
    return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function cleanTags(tags) {
    const seen = new Set();
    return (Array.isArray(tags) ? tags : [])
      .map((t) => String(t).trim().replace(/^#/, ''))
      .filter((t) => {
        const key = t.toLowerCase();
        if (!t || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /* ---------------------------------------------------------------
   * Datos de muestra del maquetado
   * ------------------------------------------------------------- */
  const SEED_POSTS = [
    {
      id: 'kanban-figma-react',
      title: 'De Figma a React: construyendo mi primer tablero Kanban',
      kind: 'Proyecto',
      tags: ['React', 'UI/UX', 'Figma'],
      image: 'assets/images/kanban-preview.svg',
      status: 'publicado',
      date: '2026-10-24T12:00:00',
      content: [
        'Cómo pasé de bocetar pantallas en Figma a tener un tablero funcional con componentes reutilizables y manejo de estado.',
        '',
        '## 01. Empezar por la estructura',
        '',
        'Antes de escribir la primera línea de código dividí el diseño de Figma en bloques claros: el contenedor general del tablero, las tres columnas de estado y las tarjetas individuales con sus etiquetas.',
        '',
        '![Vista general del tablero Kanban en modo oscuro](assets/images/kanban-preview.svg)',
        '',
        '## 02. Una interfaz pensada en componentes',
        '',
        'Cuando pasé el diseño a React me enfoqué en que cada tarjeta y cada columna recibieran únicamente los datos necesarios por props, manteniendo el estado en el componente principal.',
        '',
        '```jsx KanbanBoard.jsx',
        'export function KanbanBoard({ columns, onMoveCard }) {',
        '  return (',
        '    <section className="kanban-board">',
        '      {columns.map((col) => (',
        '        <KanbanColumn',
        '          key={col.id}',
        '          title={col.title}',
        '          tasks={col.tasks}',
        '          onMove={onMoveCard}',
        '        />',
        '      ))}',
        '    </section>',
        '  );',
        '}',
        '```',
        '',
        'De esta forma el mismo componente `<PostCard />` o `<KanbanCard />` sirve tanto para la vista pública como para la vista de edición.',
        '',
        '> **LO QUE APRENDÍ:** Separar los datos del diseño desde el inicio permite cambiar el contenido sin rehacer las tarjetas.',
        '',
        '## 03. Lo siguiente: persistir y probar',
        '',
        'El siguiente paso para este proyecto es guardar los cambios en `localStorage` y conectar las acciones de creación, edición y borrado con modales de confirmación.',
      ].join('\n'),
    },
    {
      id: 'disenar-para-construir',
      title: 'Diseñar primero me ahorró horas de código en este blog',
      kind: 'Nota',
      tags: ['UI/UX', 'Figma', 'HTML/CSS'],
      image: 'assets/images/thumb-design.svg',
      status: 'publicado',
      date: '2026-10-18T12:00:00',
      content: [
        'Definir colores, tipografías y tarjetas antes de abrir el editor hizo que maquetar fuera mucho más directo y consistente.',
        '',
        '## 01. Empezar por la paleta y las tarjetas',
        '',
        'Trabajar sobre una paleta slate oscura con acentos en índigo y cian me permitió reutilizar las mismas variables CSS en las cuatro pantallas del blog.',
        '',
        '## 02. Componentes reutilizables',
        '',
        'Las tarjetas del feed público y las de "Mi Feed" comparten la misma estructura base; únicamente cambian los botones de edición cuando la sesión de administrador está activa.',
      ].join('\n'),
    },
    {
      id: 'primera-api-fastapi',
      title: 'Mi primera API REST en Python con FastAPI paso a paso',
      kind: 'Guía',
      tags: ['Python', 'FastAPI', 'JavaScript'],
      image: 'assets/images/thumb-python.svg',
      status: 'borrador',
      date: '2026-10-10T12:00:00',
      content: [
        'Rutas, validación con Pydantic y pruebas rápidas en Swagger para conectar mi futuro backend con este blog.',
        '',
        '## 01. Estructura básica del servidor',
        '',
        '```python main.py',
        'from fastapi import FastAPI',
        '',
        'app = FastAPI()',
        '',
        '@app.get("/posts")',
        'def get_posts():',
        '    return [{"id": 1, "title": "Hola DevBlog"}]',
        '```',
        '',
        '## 02. Lo que falta por documentar',
        '',
        '- Conectar SQLite para persistir las publicaciones.',
        '- Proteger los endpoints de creación y borrado.',
      ].join('\n'),
    },
  ];

  /* ---------------------------------------------------------------
   * Persistencia
   * ------------------------------------------------------------- */
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        write(SEED_POSTS);
        return clone(SEED_POSTS);
      }
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[DevBlog] Error al leer localStorage:', error);
      return clone(SEED_POSTS);
    }
  }

  function write(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
      return true;
    } catch (error) {
      console.error('[DevBlog] Error al guardar en localStorage:', error);
      return false;
    }
  }

  function enrich(post) {
    const tags = cleanTags(post.tags);
    const kind = post.kind || 'Proyecto';
    return {
      ...post,
      kind,
      tags,
      category: tags[0] || 'General',
      excerpt: post.excerpt || makeExcerpt(post.content),
      readTime: readTime(post.content),
    };
  }

  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

  /* ---------------------------------------------------------------
   * Store (CRUD)
   * ------------------------------------------------------------- */
  const Store = {
    all() {
      return read().map(enrich).sort(byDateDesc);
    },

    published() {
      return this.all().filter((p) => p.status === 'publicado');
    },

    get(id) {
      const post = read().find((p) => p.id === id);
      return post ? enrich(post) : null;
    },

    create({ title, content = '', tags = [], image = '', kind = 'Proyecto', status = 'publicado' }) {
      const clean = cleanTags(tags);
      const post = {
        id: uid(),
        title: String(title).trim(),
        kind,
        content: String(content).trim(),
        tags: clean.length ? clean : ['React'],
        image: image || 'assets/images/kanban-preview.svg',
        status: status === 'borrador' ? 'borrador' : 'publicado',
        date: new Date().toISOString(),
      };
      const posts = read();
      posts.unshift(post);
      return write(posts) ? enrich(post) : null;
    },

    update(id, patch) {
      const posts = read();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) return null;

      const allowed = ['title', 'content', 'tags', 'image', 'kind', 'status'];
      const next = { ...posts[index] };
      allowed.forEach((key) => {
        if (patch[key] !== undefined) next[key] = patch[key];
      });
      next.title = String(next.title).trim();
      next.content = String(next.content).trim();
      next.tags = cleanTags(next.tags);
      next.updatedAt = new Date().toISOString();

      posts[index] = next;
      return write(posts) ? enrich(next) : null;
    },

    remove(id) {
      const posts = read();
      const next = posts.filter((p) => p.id !== id);
      return next.length !== posts.length && write(next);
    },

    tagCounts(posts = this.all()) {
      const base = ['React', 'UI/UX', 'Python', 'JavaScript', 'HTML/CSS', 'FastAPI'];
      const map = new Map();
      base.forEach((tag) => map.set(tag.toLowerCase(), { tag, count: 0 }));
      posts.forEach((p) =>
        p.tags.forEach((tag) => {
          const key = tag.toLowerCase();
          const entry = map.get(key) || { tag, count: 0 };
          entry.count += 1;
          map.set(key, entry);
        })
      );
      return [...map.values()];
    },

    categories(posts = this.all()) {
      return [...new Set(posts.map((p) => p.category))].sort((a, b) => a.localeCompare(b));
    },

    reset() {
      write(SEED_POSTS);
    },
  };

  /* ---------------------------------------------------------------
   * Auth (estático en el frontend)
   * ------------------------------------------------------------- */
  const Auth = {
    login(user, password) {
      const u = String(user || '').trim().toLowerCase();
      const p = String(password || '').trim();
      const validUser = CREDENTIALS.users.includes(u) || u.includes('@');
      const validPass = CREDENTIALS.passwords.includes(p) || p.length >= 4;
      const ok = Boolean(u && p && validUser && validPass);
      if (ok) localStorage.setItem(AUTH_KEY, 'true');
      return ok;
    },
    logout() {
      localStorage.removeItem(AUTH_KEY);
    },
    isAdmin() {
      return localStorage.getItem(AUTH_KEY) === 'true';
    },
  };

  window.DevBlog = {
    Store,
    Auth,
    Utils: { escapeHtml, normalizeText, slugify, formatDate, readTime, makeExcerpt },
  };
})();
