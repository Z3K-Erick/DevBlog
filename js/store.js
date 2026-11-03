/**
 * DevBlog — Capa de datos, perfil y autenticación de administrador único
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'devblog:posts:v4';
  const AVATAR_KEY = 'devblog:avatar:v1';
  const AUTH_KEY = 'devblog:admin:session';
  const DEFAULT_AVATAR = 'assets/images/avatar.svg';

  // Único administrador autorizado (comparación estricta)
  const ADMIN_ACCOUNT = {
    email: 'erick@devblog.com',
    user: 'z3k-erick',
    passwordHash: 'Erick#DevBlog2026!',
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
    return `${Math.max(1, Math.round(words / 180))} min de lectura`;
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
   * Única publicación inicial: el proyecto DevBlog
   * ------------------------------------------------------------- */
  const SEED_POSTS = [
    {
      id: 'proyecto-devblog',
      title: 'Construyendo mi propio DevBlog: del diseño en Figma al código',
      kind: 'Proyecto',
      tags: ['HTML/CSS', 'JavaScript', 'UI/UX'],
      image: 'assets/images/thumb-design.svg',
      status: 'publicado',
      date: '2026-11-02T12:00:00',
      content: [
        'Este es el primer post oficial de mi DevBlog: una plataforma creada desde cero para documentar mis proyectos, prácticas y avances mientras estudio ingeniería.',
        '',
        '## 01. El diseño y la estructura',
        '',
        'Antes de programar definí en Figma las vistas principales sobre una paleta oscura en tonos slate e índigo, separando la lectura pública de mi panel privado de administración.',
        '',
        '- **Feed público:** donde cualquiera puede leer las publicaciones terminadas y filtrarlas por tecnología.',
        '- **Vista de lectura:** artículos completos con bloques de código, imágenes y tabla de contenido.',
        '- **Panel de administrador:** mi espacio privado para publicar avances, editar en caliente y gestionar entradas.',
        '',
        '## 02. Maquetado modular en HTML, CSS y JS',
        '',
        'Para que el blog sea rápido y fácil de mantener, organicé los estilos mediante variables CSS y separé la capa de datos para crear, editar o eliminar publicaciones dinámicamente.',
        '',
        '```js store.js',
        '// Crear una nueva publicación desde el panel privado',
        'Store.create({',
        '  title: "Nuevo avance del proyecto",',
        '  kind: "Proyecto",',
        '  tags: ["HTML/CSS", "JavaScript"],',
        '  status: "publicado",',
        '});',
        '```',
        '',
        '> **LO QUE APRENDÍ:** Diseñar primero la estructura de tarjetas y componentes hace que pasar de Figma a código sea mucho más limpio y ordenado.',
        '',
        '## 03. Próximos pasos',
        '',
        'A partir de aquí iré subiendo mis siguientes prácticas, notas y proyectos directamente desde el panel de administración de este blog.',
      ].join('\n'),
    },
  ];

  /* ---------------------------------------------------------------
   * Persistencia de publicaciones y foto de perfil
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
        tags: clean.length ? clean : ['Proyecto'],
        image: image || '',
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

    tagCounts(posts = this.published()) {
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

    /* Foto de perfil del administrador */
    getAvatar() {
      try {
        return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
      } catch {
        return DEFAULT_AVATAR;
      }
    },

    setAvatar(dataUrl) {
      try {
        if (!dataUrl) localStorage.removeItem(AVATAR_KEY);
        else localStorage.setItem(AVATAR_KEY, dataUrl);
        return true;
      } catch {
        return false;
      }
    },
  };

  /* ---------------------------------------------------------------
   * Auth — Validación estricta del único administrador
   * ------------------------------------------------------------- */
  const Auth = {
    login(user, password) {
      const u = String(user || '').trim().toLowerCase();
      const p = String(password || '');
      const validUser = u === ADMIN_ACCOUNT.email || u === ADMIN_ACCOUNT.user;
      const validPass = p === ADMIN_ACCOUNT.passwordHash;
      if (validUser && validPass) {
        localStorage.removeItem('isAdmin'); // limpia llaves antiguas de prueba
        localStorage.setItem(AUTH_KEY, 'active');
        return true;
      }
      return false;
    },
    logout() {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem(AUTH_KEY);
    },
    isAdmin() {
      return localStorage.getItem(AUTH_KEY) === 'active';
    },
  };

  window.DevBlog = {
    Store,
    Auth,
    Utils: { escapeHtml, normalizeText, slugify, formatDate, readTime, makeExcerpt },
  };
})();
