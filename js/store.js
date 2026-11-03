/**
 * DevBlog - Data Store & State Management
 * Proporciona persistencia en localStorage para que el maquetado sea 100% interactivo
 * y permita agregar, editar y eliminar publicaciones reales en el futuro.
 */

const STORAGE_KEY = 'devblog_posts_data';
const THEME_KEY = 'devblog_theme';

// Datos iniciales basados en los mockups de Figma
const INITIAL_POSTS = [
  {
    id: 'post-1',
    slug: 'de-figma-a-react-tablero-kanban',
    title: 'De Figma a React: construyendo mi primer tablero Kanban',
    excerpt: 'Cómo transformé un diseño conceptual en Figma en una aplicación funcional con React, TypeScript y Tailwind CSS, superando desafíos de drag-and-drop y gestión de estado.',
    coverImage: 'assets/images/kanban-preview.svg',
    category: 'React',
    tags: ['React', 'UI/UX', 'TypeScript', 'TailwindCSS'],
    featured: true,
    status: 'publicado',
    date: '2024-10-12',
    formattedDate: '12 Oct 2024',
    readTime: '8 min de lectura',
    author: {
      name: 'Erick',
      role: 'Frontend Developer',
      avatar: 'assets/images/avatar.svg'
    },
    content: `
      <p class="lead-paragraph">
        Cuando comencé este proyecto, mi objetivo era entender cómo se traslada un diseño complejo de Figma a código real, funcional y mantenible. En este artículo documento todo el proceso técnico, desde la preparación de tokens de diseño hasta la implementación de drag-and-drop fluido.
      </p>

      <h2 id="seccion-1">01. Paso a paso por la estructura</h2>
      <p>
        El primer paso fue analizar la jerarquía visual del tablero. En Figma, definí un sistema de auto-layout con tres niveles fundamentales:
      </p>
      <ul>
        <li><strong>Tablero principal:</strong> Contenedor horizontal responsivo con scroll horizontal controlado.</li>
        <li><strong>Columnas de estado:</strong> "Por hacer", "En progreso" y "Completado", cada una con un indicador de color y contador de tareas.</li>
        <li><strong>Tarjetas de tarea:</strong> Tarjetas con etiquetas de prioridad, título, breve descripción e indicador de asignación.</li>
      </ul>

      <div class="article-image-box">
        <img src="assets/images/kanban-preview.svg" alt="Diseño conceptual del tablero Kanban en Figma" class="article-image" />
        <span class="image-caption">Figura 1.1: Interfaz completa del tablero con las columnas de estado y tarjetas activas.</span>
      </div>

      <h2 id="seccion-2">02. Usando React para componentes</h2>
      <p>
        Para la implementación en React, decidí estructurar el código en componentes modulares e independientes. Cada componente tiene una única responsabilidad y recibe únicamente las props necesarias.
      </p>

      <div class="code-block-container">
        <div class="code-block-header">
          <span class="code-filename">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            KanbanBoard.jsx
          </span>
          <button class="btn-copy-code" onclick="copyCode(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copiar</span>
          </button>
        </div>
        <pre><code class="language-javascript">import React, { useState } from 'react';
import { Column } from './Column';
import { initialColumns } from '../data/kanbanData';

export function KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    // Lógica para reordenar y mover tarjetas entre columnas
    console.log(\`Moviendo tarea \${active.id} hacia \${over.id}\`);
  };

  return (
    &lt;div className="kanban-grid"&gt;
      {columns.map((col) => (
        &lt;Column key={col.id} column={col} /&gt;
      ))}
    &lt;/div&gt;
  );
}</code></pre>
      </div>

      <div class="callout-box">
        <div class="callout-icon">💡</div>
        <div class="callout-content">
          <h4>Tip de rendimiento</h4>
          <p>Al manipular estados con operaciones de drag-and-drop, mantén el estado en el ancestro común más cercano y memoiza los componentes hijos con <code>React.memo</code> para evitar re-renders innecesarios en columnas inactivas.</p>
        </div>
      </div>

      <h2 id="seccion-3">03. Lo siguiente: persistencia y pruebas</h2>
      <p>
        Una interfaz atractiva no es suficiente si los datos se pierden al recargar la página. Para la persistencia, utilicé <code>localStorage</code> combinado con sincronización asíncrona hacia un backend REST. Además, cubrí los flujos críticos de usuario utilizando <em>React Testing Library</em> y <em>Jest</em>.
      </p>
      <p>
        El resultado final es una herramienta visual, responsiva y altamente interactiva que valida cómo el diseño de sistemas en Figma puede acelerar drásticamente el desarrollo en React.
      </p>
    `
  },
  {
    id: 'post-2',
    slug: 'disenar-para-construir-perspectiva-dev',
    title: 'Diseñar para construir: la perspectiva de un dev',
    excerpt: 'Claves para diseñar interfaces en Figma pensando en la estructura del DOM, Flexbox, Grid y la reutilización de componentes en frontend.',
    coverImage: 'assets/images/thumb-design.svg',
    category: 'UI/UX',
    tags: ['UI/UX', 'Figma', 'CSS', 'Diseño'],
    featured: false,
    status: 'publicado',
    date: '2024-10-08',
    formattedDate: '08 Oct 2024',
    readTime: '5 min de lectura',
    author: {
      name: 'Erick',
      role: 'Frontend Developer',
      avatar: 'assets/images/avatar.svg'
    },
    content: `
      <p class="lead-paragraph">
        Muchos diseñadores crean conceptos espectaculares que resultan una pesadilla para maquetar. En este artículo exploramos cómo alinear Figma con las capacidades reales de CSS moderno.
      </p>
      <h2 id="seccion-1">01. Pensar en cajas y flujo normal</h2>
      <p>
        Comprender el modelo de caja de CSS y cómo Auto-Layout de Figma mapea directamente a Flexbox es la clave para que diseñadores y desarrolladores hablen el mismo idioma.
      </p>
      <h2 id="seccion-2">02. Design Tokens y Variables CSS</h2>
      <p>
        Al sincronizar variables de color, espaciado y tipografía entre Figma y tokens de CSS (o Tailwind), cualquier cambio en el diseño se refleja automáticamente en la base de código.
      </p>
    `
  },
  {
    id: 'post-3',
    slug: '4-errores-comunes-react-hooks',
    title: '4 errores comunes al comenzar con React Hooks',
    excerpt: 'Evita dependencias faltantes en useEffect, recreación de funciones en cada render y problemas de bucles infinitos con estos patrones clave.',
    coverImage: 'assets/images/thumb-react.svg',
    category: 'React',
    tags: ['React', 'JavaScript', 'Buenas Prácticas'],
    featured: false,
    status: 'publicado',
    date: '2024-10-02',
    formattedDate: '02 Oct 2024',
    readTime: '6 min de lectura',
    author: {
      name: 'Erick',
      role: 'Frontend Developer',
      avatar: 'assets/images/avatar.svg'
    },
    content: `
      <p class="lead-paragraph">
        Los React Hooks revolucionaron la forma de escribir componentes, pero también introdujeron trampas comunes que pueden causar fugas de memoria o re-renderizados innecesarios.
      </p>
      <h2 id="seccion-1">01. Dependencias omitidas en useEffect</h2>
      <p>
        El linter de React existe por una razón. Omitir variables en el arreglo de dependencias es la principal causa de bugs con estado desactualizado (stale closures).
      </p>
      <h2 id="seccion-2">02. Abuso prematuro de useMemo y useCallback</h2>
      <p>
        No todo necesita ser memorizado. Muchas veces el costo computacional de memorizar supera el ahorro de rendimiento.
      </p>
    `
  },
  {
    id: 'post-4',
    slug: 'optimizacion-rendimiento-nextjs',
    title: 'Optimización de rendimiento web en Next.js',
    excerpt: 'Aprende a analizar Core Web Vitals, optimizar imágenes, dividir paquetes JS y aprovechar Server Components para lograr un puntaje de 100 en Lighthouse.',
    coverImage: 'assets/images/thumb-next.svg',
    category: 'Frontend',
    tags: ['NextJS', 'Frontend', 'Rendimiento', 'SEO'],
    featured: false,
    status: 'borrador',
    date: '2024-09-28',
    formattedDate: '28 Sep 2024',
    readTime: '7 min de lectura',
    author: {
      name: 'Erick',
      role: 'Frontend Developer',
      avatar: 'assets/images/avatar.svg'
    },
    content: `
      <p class="lead-paragraph">
        El rendimiento web impacta directamente en la experiencia de usuario y en la retención. Aquí vemos estrategias avanzadas para Next.js App Router.
      </p>
      <h2 id="seccion-1">01. Server Components vs Client Components</h2>
      <p>
        Enviar cero JavaScript al cliente para componentes estáticos es la mayor ventaja del nuevo paradigma de React Server Components.
      </p>
    `
  }
];

// Módulo BlogStore
const BlogStore = {
  // Inicializa o recupera las publicaciones de localStorage
  getPosts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveAllPosts(INITIAL_POSTS);
        return INITIAL_POSTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error al leer de localStorage:', e);
      return INITIAL_POSTS;
    }
  },

  // Guarda la lista completa
  saveAllPosts(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  },

  // Obtiene una publicación por ID
  getPostById(id) {
    const posts = this.getPosts();
    return posts.find(p => p.id === id) || null;
  },

  // Obtiene una publicación por Slug
  getPostBySlug(slug) {
    const posts = this.getPosts();
    return posts.find(p => p.slug === slug) || null;
  },

  // Guarda o actualiza una publicación
  savePost(postData) {
    const posts = this.getPosts();
    const existingIndex = posts.findIndex(p => p.id === postData.id);

    if (existingIndex >= 0) {
      posts[existingIndex] = { ...posts[existingIndex], ...postData };
    } else {
      // Nueva publicación
      const newPost = {
        id: postData.id || 'post-' + Date.now(),
        slug: postData.slug || this.generateSlug(postData.title),
        title: postData.title,
        excerpt: postData.excerpt || '',
        coverImage: postData.coverImage || 'assets/images/kanban-preview.svg',
        category: postData.category || 'General',
        tags: postData.tags || [],
        featured: postData.featured || false,
        status: postData.status || 'publicado',
        date: postData.date || new Date().toISOString().split('T')[0],
        formattedDate: this.formatDate(postData.date || new Date().toISOString().split('T')[0]),
        readTime: postData.readTime || '5 min de lectura',
        author: postData.author || {
          name: 'Erick',
          role: 'Frontend Developer',
          avatar: 'assets/images/avatar.svg'
        },
        content: postData.content || ''
      };
      posts.unshift(newPost);
    }

    this.saveAllPosts(posts);
    return true;
  },

  // Elimina una publicación
  deletePost(id) {
    let posts = this.getPosts();
    posts = posts.filter(p => p.id !== id);
    this.saveAllPosts(posts);
    return true;
  },

  // Obtiene las categorías únicas con conteo
  getCategories() {
    const posts = this.getPosts();
    const categoriesMap = {};
    posts.forEach(p => {
      if (p.category) {
        categoriesMap[p.category] = (categoriesMap[p.category] || 0) + 1;
      }
    });
    return categoriesMap;
  },

  // Generador de slug a partir de un título
  generateSlug(title) {
    if (!title) return 'articulo-' + Date.now();
    return title
      .toLowerCase()
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-');
  },

  // Formateador de fecha amigable (ej: 12 Oct 2024)
  formatDate(dateStr) {
    if (!dateStr) return '';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${months[monthIdx] || ''} ${year}`;
    }
    return dateStr;
  },

  // Restaura los datos originales de prueba
  resetToDefaults() {
    this.saveAllPosts(INITIAL_POSTS);
    return INITIAL_POSTS;
  }
};

// Exportar globalmente
window.BlogStore = BlogStore;
