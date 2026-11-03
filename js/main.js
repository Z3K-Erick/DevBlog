/**
 * DevBlog - Main Scripts & Global Logic
 * Control de navegación móvil, toast, modales y renderizado del feed (index.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initModals();
  
  // Si estamos en la página de inicio (index.html)
  if (document.getElementById('posts-container')) {
    initHomePage();
  }
});

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' 
    ? '✓' 
    : type === 'error' 
      ? '✕' 
      : 'ℹ';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-weight: 700;">${icon}</span>
      <span>${message}</span>
    </div>
    <button style="color: var(--text-muted); cursor: pointer; font-size: 1rem;" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

window.showToast = showToast;

// ==========================================================================
// CONTROL DE MODALES
// ==========================================================================
function initModals() {
  // Cerrar modal al presionar backdrop o botón close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

// ==========================================================================
// MENÚ MÓVIL
// ==========================================================================
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.querySelector('.mobile-drawer');

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.toggle('is-open');
    });
  }
}

// ==========================================================================
// PÁGINA DE INICIO (HOME / FEED)
// ==========================================================================
let currentFilter = 'todos';

function initHomePage() {
  renderFeed();
  renderSidebar();

  // Búsqueda en el header
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      renderFeed(term);
    });
  }

  // Cargar más publicaciones
  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.innerHTML = `
        <span style="display:inline-block; animation: spin 1s infinite linear;">↻</span> Cargando...
      `;
      loadMoreBtn.disabled = true;

      setTimeout(() => {
        showToast('Todas las publicaciones disponibles han sido cargadas.', 'info');
        loadMoreBtn.innerText = 'No hay más publicaciones';
        loadMoreBtn.style.opacity = '0.6';
      }, 700);
    });
  }
}

function renderFeed(searchTerm = '') {
  const postsContainer = document.getElementById('posts-container');
  const featuredContainer = document.getElementById('featured-container');
  if (!postsContainer) return;

  const allPosts = BlogStore.getPosts().filter(p => p.status === 'publicado');
  
  // Filtrar por búsqueda o categoría
  let filtered = allPosts;
  if (currentFilter !== 'todos') {
    filtered = filtered.filter(p => 
      p.category.toLowerCase() === currentFilter.toLowerCase() ||
      (p.tags && p.tags.some(t => t.toLowerCase() === currentFilter.toLowerCase()))
    );
  }

  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      p.excerpt.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
    );
  }

  // Artículo Destacado
  if (featuredContainer) {
    const featuredPost = filtered.find(p => p.featured) || filtered[0];
    if (featuredPost && !searchTerm && currentFilter === 'todos') {
      featuredContainer.style.display = 'block';
      featuredContainer.innerHTML = `
        <article class="featured-card">
          <a href="post.html?id=${featuredPost.id}" class="featured-cover-wrapper">
            <img src="${featuredPost.coverImage}" alt="${featuredPost.title}" class="featured-cover-img" />
          </a>
          <div class="featured-body">
            <div class="featured-meta">
              <span class="badge badge-react">${featuredPost.category}</span>
              ${featuredPost.tags.slice(0, 2).map(t => `<span class="badge badge-ui">${t}</span>`).join('')}
            </div>
            <h2 class="featured-title">
              <a href="post.html?id=${featuredPost.id}">${featuredPost.title}</a>
            </h2>
            <p class="featured-excerpt">${featuredPost.excerpt}</p>
            <div class="featured-footer">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${featuredPost.formattedDate}</span>
                <span>•</span>
                <span>${featuredPost.readTime}</span>
              </div>
              <a href="post.html?id=${featuredPost.id}" class="btn btn-primary btn-sm">
                Leer artículo →
              </a>
            </div>
          </div>
        </article>
      `;
    } else {
      featuredContainer.style.display = 'none';
    }
  }

  // Lista de publicaciones (excluyendo el featured si no hay búsqueda)
  const listPosts = (!searchTerm && currentFilter === 'todos')
    ? filtered.filter(p => !p.featured)
    : filtered;

  if (listPosts.length === 0) {
    postsContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No se encontraron publicaciones</p>
        <p style="font-size: 0.875rem;">Intenta con otros términos o crea una nueva publicación en el Gestor.</p>
      </div>
    `;
    return;
  }

  postsContainer.innerHTML = listPosts.map(post => `
    <article class="post-card">
      <a href="post.html?id=${post.id}" class="post-thumb-wrapper">
        <img src="${post.coverImage}" alt="${post.title}" class="post-thumb-img" />
      </a>
      <div class="post-card-content">
        <div>
          <div class="post-card-meta">
            <span class="badge badge-react">${post.category}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${post.readTime}</span>
          </div>
          <h3 class="post-card-title">
            <a href="post.html?id=${post.id}">${post.title}</a>
          </h3>
          <p class="post-card-excerpt">${post.excerpt}</p>
        </div>
        <div class="post-card-footer">
          <span>${post.formattedDate}</span>
          <span>•</span>
          <span>Por ${post.author ? post.author.name : 'Erick'}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function renderSidebar() {
  // Render de tags populares
  const tagCloud = document.getElementById('popular-tags-cloud');
  if (tagCloud) {
    const categories = BlogStore.getCategories();
    let html = `
      <button class="tag-pill ${currentFilter === 'todos' ? 'active' : ''}" onclick="filterByTopic('todos')">
        Todos <span class="tag-count">${BlogStore.getPosts().length}</span>
      </button>
    `;

    for (const [cat, count] of Object.entries(categories)) {
      html += `
        <button class="tag-pill ${currentFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" onclick="filterByTopic('${cat}')">
          #${cat} <span class="tag-count">${count}</span>
        </button>
      `;
    }
    tagCloud.innerHTML = html;
  }

  // Render de publicaciones destacadas en sidebar
  const popularList = document.getElementById('popular-posts-list');
  if (popularList) {
    const posts = BlogStore.getPosts().slice(0, 3);
    popularList.innerHTML = posts.map((post, idx) => `
      <a href="post.html?id=${post.id}" class="popular-item">
        <span class="popular-num">0${idx + 1}</span>
        <div>
          <h4 class="popular-item-title">${post.title}</h4>
          <span class="popular-item-date">${post.formattedDate} • ${post.readTime}</span>
        </div>
      </a>
    `).join('');
  }
}

function filterByTopic(topic) {
  currentFilter = topic;
  renderFeed();
  renderSidebar();

  // Actualizar indicador en hero topics si existen
  document.querySelectorAll('.hero-topic-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.topic === topic);
  });
}

window.filterByTopic = filterByTopic;
