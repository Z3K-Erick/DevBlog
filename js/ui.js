/**
 * DevBlog — Componentes de interfaz compartidos (Landing pública)
 * ---------------------------------------------------------------
 * - Toasts, buscador del header y sincronización de avatares.
 * - Componente reutilizable PostCard para el feed público.
 */
(function () {
  'use strict';

  const { Utils } = window.DevBlog;
  const esc = Utils.escapeHtml;

  const svg = (paths, size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const Icons = {
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 13),
    eye: svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 13),
    heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>', 13),
  };

  /* ---------------------------------------------------------------
   * Toasts
   * ------------------------------------------------------------- */
  function toast(message, type = 'info') {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3000);
  }

  /* ---------------------------------------------------------------
   * Colores de tags
   * ------------------------------------------------------------- */
  function tagClass(tag) {
    const key = Utils.normalizeText(tag);
    if (key.includes('react') || key.includes('fast')) return 'tag--c1';
    if (key.includes('ui') || key.includes('ux') || key.includes('css')) return 'tag--c2';
    if (key.includes('figma') || key.includes('python') || key.includes('back')) return 'tag--c3';
    if (key.includes('js') || key.includes('java')) return 'tag--c4';
    return 'tag--c0';
  }

  /* ---------------------------------------------------------------
   * PostCard público
   * ------------------------------------------------------------- */
  function postCard(post, { variant = 'row' } = {}) {
    const url = `post.html?id=${encodeURIComponent(post.id)}`;
    // Si post.layout está definido ('side' o 'top'), se respeta fielmente.
    // Si no está definido, se adapta de forma inteligente según la relación de aspecto.
    const explicitLayout = post.layout === 'top' ? 'featured' : (post.layout === 'side' ? 'row' : null);
    const autoVariant = explicitLayout || (variant === 'featured' ? 'featured' : 'row');
    const onloadAttr = explicitLayout
      ? ''
      : `onload="if(this.naturalWidth&&this.naturalHeight){const feat=this.naturalWidth/this.naturalHeight>=1.9;this.closest('.post-card').classList.toggle('post-card--featured',feat);this.closest('.post-card').classList.toggle('post-card--row',!feat);}"`;
    const media = post.image
      ? `<a class="post-card-media" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(post.image)}" alt="" loading="lazy" ${onloadAttr}></a>`
      : '';

    const kindLabel = (post.kind || 'Proyecto').toUpperCase();
    const dateLabel = Utils.formatDate(post.date).toUpperCase();
    const viewsCount = Number(post.views) || 0;
    const likesCount = Number(post.likes) || 0;

    if (autoVariant === 'featured') {
      return `
        <article class="post-card post-card--featured" data-id="${esc(post.id)}">
          ${media}
          <div class="post-card-body">
            <div class="post-card-top">
              <span class="featured-kicker">${esc(kindLabel)} DESTACADO · ${esc(dateLabel)}</span>
              <div class="post-card-meta-group">
                <span class="post-meta-stat" title="${viewsCount} vistas">${Icons.eye} <span>${viewsCount}</span></span>
                <span class="post-meta-stat" title="${likesCount} likes">${Icons.heart} <span>${likesCount}</span></span>
                <span class="post-readtime">${Icons.clock} ${esc(post.readTime)}</span>
              </div>
            </div>
            <h3 class="post-card-title"><a href="${url}">${esc(post.title)}</a></h3>
            ${post.excerpt ? `<p class="post-card-excerpt">${esc(post.excerpt)}</p>` : ''}
            <div class="post-card-footer">
              <div class="chip-list">
                ${post.tags.map((t) => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}
              </div>
              <a class="btn btn-primary btn-sm" href="${url}">Leer post →</a>
            </div>
          </div>
        </article>`;
    }

    const metaLine = `<p class="post-kicker">${esc(kindLabel)} · ${esc(dateLabel)} · ${esc(post.readTime.toUpperCase())} · <span class="post-meta-stat" title="${viewsCount} vistas">${Icons.eye} ${viewsCount}</span> · <span class="post-meta-stat" title="${likesCount} likes">${Icons.heart} ${likesCount}</span></p>`;
    const footerLeft = `<div class="chip-list">${post.tags.map((t) => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}</div>`;

    return `
      <article class="post-card post-card--row${post.image ? '' : ' post-card--no-media'}" data-id="${esc(post.id)}">
        ${media}
        <div class="post-card-body">
          ${metaLine}
          <h3 class="post-card-title"><a href="${url}">${esc(post.title)}</a></h3>
          ${post.excerpt ? `<p class="post-card-excerpt">${esc(post.excerpt)}</p>` : ''}
          <div class="post-card-footer">
            ${footerLeft}
            <a class="link-arrow" href="${url}">Leer post <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </article>`;
  }

  /* ---------------------------------------------------------------
   * Sincronización de foto de perfil y Header
   * ------------------------------------------------------------- */
  function syncAvatars() {
    const src = window.DevBlog.Store.getAvatar();
    document
      .querySelectorAll('.avatar-btn img, .profile-avatar-circle img, .post-author-avatar, [data-user-avatar]')
      .forEach((img) => {
        img.src = src;
      });
  }

  function initHeader() {
    syncAvatars();

    const search = document.getElementById('header-search');
    if (search) {
      search.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.body.dataset.page === 'feed') return;
        const q = search.querySelector('input').value.trim();
        window.location.href = `index.html${q ? `?q=${encodeURIComponent(q)}` : ''}#feed`;
      });
    }
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-code]');
    if (!btn) return;
    const code = btn.closest('.code-block')?.querySelector('pre')?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = '¡Copiado!';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = 'Copiar';
        btn.classList.remove('is-copied');
      }, 1800);
    } catch {
      toast('No se pudo copiar el código', 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', initHeader);

  window.UI = {
    Icons,
    toast,
    postCard,
    tagClass,
    syncAvatars,
  };
})();
