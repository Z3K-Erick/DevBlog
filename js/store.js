/**
 * DevBlog — Capa de datos, perfil y autenticación de administrador único
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'devblog:posts:v4';
  const AVATAR_KEY = 'devblog:avatar:v1';
  const SITE_KEY = 'devblog:siteconfig:v1';
  const DEFAULT_AVATAR = 'assets/images/avatar.svg';
  const API_BASE_URL = window.DEVBLOG_API_URL || 'http://127.0.0.1:8001';

  const DEFAULT_SITE_CONFIG = {
    profile: {
      name: 'Erick',
      role: 'Estudiante de Ingeniería · Dev',
      bio: 'Estudiante de ingeniería construyendo proyectos web.',
      location: 'México',
      githubUrl: 'https://github.com/Z3K-Erick',
      githubLabel: 'GitHub',
    },
    technologies: ['React', 'UI/UX', 'Python', 'JavaScript', 'HTML/CSS', 'FastAPI'],
    projects: [
      {
        icon: '</>',
        name: 'DevBlog',
        desc: 'Maquetado + panel de administración',
      },
    ],
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
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b && !/^(#{1,3}\s|>|[-*]\s|\d+\.\s)/.test(b));

    const text = (blocks[0] || '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
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
      layout: 'side',
      tags: ['HTML/CSS', 'JavaScript', 'UI/UX'],
      image: 'assets/images/thumb-design.svg',
      status: 'publicado',
      date: '2026-11-02T12:00:00',
      views: 0,
      likes: 0,
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
      views: Number(post.views) || 0,
      likes: Number(post.likes) || 0,
      category: tags[0] || 'General',
      excerpt: post.excerpt || makeExcerpt(post.content),
      readTime: readTime(post.content),
    };
  }

  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

  function notifyStoreUpdate() {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('devblog:synced'));
  }

  async function apiRequest(path, options = {}) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CMS-Cliente': 'DevBlog-Web-CMS',
          ...(options.headers || {}),
        },
        ...options,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function syncFromApi() {
    const [postsData, cfgData] = await Promise.all([
      apiRequest('/proyectos'),
      apiRequest('/configuracion'),
    ]);
    let changed = false;
    if (Array.isArray(postsData)) {
      write(postsData);
      changed = true;
    }
    if (cfgData && typeof cfgData === 'object') {
      const nextCfg = {
        profile: { ...DEFAULT_SITE_CONFIG.profile, ...(cfgData.profile || {}) },
        technologies: Array.isArray(cfgData.technologies)
          ? cfgData.technologies
          : [...DEFAULT_SITE_CONFIG.technologies],
        projects: Array.isArray(cfgData.projects)
          ? cfgData.projects
          : clone(DEFAULT_SITE_CONFIG.projects),
      };
      localStorage.setItem(SITE_KEY, JSON.stringify(nextCfg));
      if (cfgData.avatar && cfgData.avatar !== DEFAULT_AVATAR) {
        localStorage.setItem(AVATAR_KEY, cfgData.avatar);
      }
      changed = true;
    }
    if (changed) notifyStoreUpdate();
    return changed;
  }

  const Store = {
    apiUrl: API_BASE_URL,
    syncFromApi,

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

    /* -------------------------------------------------------------
     * Telemetría y Métricas (Vistas, Likes y Analítica)
     * ----------------------------------------------------------- */
    async incrementPostView(id) {
      if (!id) return null;
      try {
        const res = await apiRequest(`/api/posts/${encodeURIComponent(id)}/view`, {
          method: 'POST',
        });
        if (res && typeof res.views === 'number') {
          const posts = read();
          const idx = posts.findIndex((p) => p.id === id);
          if (idx !== -1) {
            posts[idx].views = res.views;
            write(posts);
          }
          return res;
        }
      } catch (err) {
        // Manejo silencioso: la telemetría nunca interrumpe la navegación
      }
      return null;
    },

    async togglePostLike(id, liked) {
      if (!id) return null;
      try {
        const payload = typeof liked === 'boolean' ? { liked } : { toggle: true };
        const res = await apiRequest(`/api/posts/${encodeURIComponent(id)}/like`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res && typeof res.likes === 'number') {
          const posts = read();
          const idx = posts.findIndex((p) => p.id === id);
          if (idx !== -1) {
            posts[idx].likes = res.likes;
            write(posts);
          }
          return res;
        }
      } catch (err) {
        // Manejo silencioso
      }
      return null;
    },

    async getAnalyticsSummary() {
      try {
        const res = await apiRequest('/api/analytics/summary');
        if (res && typeof res.total_views === 'number') {
          return res;
        }
      } catch (err) {
        // Fallback silencioso a cálculo local
      }

      // Cálculo de respaldo desde el estado local si la API está inaccesible
      const allPosts = this.all();
      const totalViews = allPosts.reduce((acc, p) => acc + (Number(p.views) || 0), 0);
      const totalLikes = allPosts.reduce((acc, p) => acc + (Number(p.likes) || 0), 0);
      const topPosts = [...allPosts]
        .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
        .slice(0, 5);

      const viewsByTag = {};
      allPosts.forEach((p) => {
        const v = Number(p.views) || 0;
        (p.tags || []).forEach((t) => {
          const clean = String(t).trim();
          if (clean) viewsByTag[clean] = (viewsByTag[clean] || 0) + v;
        });
      });

      return {
        total_views: totalViews,
        total_likes: totalLikes,
        top_posts: topPosts,
        views_by_tag: viewsByTag,
      };
    },

    tagCounts(posts = this.published()) {
      const cfg = this.getSiteConfig();
      const base = Array.isArray(cfg.technologies) ? cfg.technologies : DEFAULT_SITE_CONFIG.technologies;
      const map = new Map();
      base.forEach((tag) => {
        const clean = String(tag).trim();
        if (clean) map.set(clean.toLowerCase(), { tag: clean, count: 0 });
      });
      posts.forEach((p) =>
        p.tags.forEach((tag) => {
          const key = tag.toLowerCase();
          if (map.has(key)) {
            map.get(key).count += 1;
          }
        })
      );
      return [...map.values()];
    },

    categories(posts = this.all()) {
      return [...new Set(posts.map((p) => p.category))].sort((a, b) => a.localeCompare(b));
    },

    /* Configuración del perfil y barra lateral */
    getSiteConfig() {
      try {
        const raw = localStorage.getItem(SITE_KEY);
        if (!raw) return clone(DEFAULT_SITE_CONFIG);
        const parsed = JSON.parse(raw);
        return {
          profile: { ...DEFAULT_SITE_CONFIG.profile, ...(parsed.profile || {}) },
          technologies: Array.isArray(parsed.technologies)
            ? parsed.technologies
            : [...DEFAULT_SITE_CONFIG.technologies],
          projects: Array.isArray(parsed.projects)
            ? parsed.projects
            : clone(DEFAULT_SITE_CONFIG.projects),
        };
      } catch {
        return clone(DEFAULT_SITE_CONFIG);
      }
    },

    /* Foto de perfil */
    getAvatar() {
      try {
        return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
      } catch {
        return DEFAULT_AVATAR;
      }
    },
  };

  // Hidratar desde la API en segundo plano al iniciar la página
  syncFromApi();

  window.DevBlog = {
    Store,
    Utils: { escapeHtml, normalizeText, slugify, formatDate, readTime, makeExcerpt },
  };
})();
