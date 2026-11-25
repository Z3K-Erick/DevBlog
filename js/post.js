/**
 * DevBlog — Lectura Completa / El Hilo (post.html)
 */
(function () {
  'use strict';

  const { Store, Utils, Markdown } = window.DevBlog;
  const { tagClass, toast } = window.UI;
  const esc = Utils.escapeHtml;

  const REPO_URL = 'https://github.com/Z3K-Erick/DevBlog';
  const root = document.getElementById('post-root');

  function renderPostPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    const post = id ? Store.get(id) : Store.published()[0];
    const canView = Boolean(post && post.status === 'publicado');

    if (!canView) {
      document.title = 'Post no encontrado — {EG} DevBlog';
      root.innerHTML = `
        <div class="empty-state empty-state--page">
          <p class="empty-state-title">Esta publicación no está disponible</p>
          <p>Puede que se haya eliminado o que sea un borrador privado.</p>
          <a href="index.html" class="btn btn-primary">← Volver al feed</a>
        </div>`;
      return;
    }

    document.title = `${post.title} — {EG} DevBlog`;

    // Telemetría: Registro automático de vista única por sesión
    const viewedKey = `devblog:viewed:${post.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      sessionStorage.setItem(viewedKey, '1');
      Store.incrementPostView(post.id).then((res) => {
        if (res && typeof res.views === 'number') {
          post.views = res.views;
          const vVal = document.getElementById('post-views-val');
          if (vVal) vVal.textContent = res.views;
          const vKicker = document.getElementById('post-views-kicker');
          if (vKicker) vKicker.textContent = res.views;
        }
      });
    }

    const { html, headings } = Markdown.render(post.content);
    const kindLabel = (post.kind || 'Proyecto').toUpperCase();
    const dateLabel = Utils.formatDate(post.date).toUpperCase();
    const profile = Store.getSiteConfig().profile;

    const likedKey = `devblog:liked:${post.id}`;
    let isLiked = localStorage.getItem(likedKey) === 'true';
    let currentLikes = Number(post.likes) || 0;
    const viewsCount = Number(post.views) || 0;

    root.innerHTML = `
      <a href="index.html" class="back-link">← Volver al feed</a>

      <div class="post-layout">
        <article class="post-article">
          <header class="post-header">
            <p class="featured-kicker">
              ${esc(kindLabel)} · PUBLICADO EL ${esc(dateLabel)} · ${esc(post.readTime.toUpperCase())}
              · <span class="post-metric-inline" title="${viewsCount} vistas"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> <span id="post-views-kicker">${viewsCount}</span> vistas</span>
            </p>
            <h1 class="post-title">${esc(post.title)}</h1>
            ${post.excerpt ? `<p class="post-lead">${esc(post.excerpt)}</p>` : ''}
            <div class="post-author">
              <img src="${esc(Store.getAvatar())}" alt="${esc(profile.name)}" class="post-author-avatar" width="36" height="36" data-user-avatar>
              <div>
                <span class="post-author-name">${esc(profile.name)}</span>
                <span class="post-author-role">${esc(profile.role)}</span>
              </div>
              <div class="chip-list post-author-tags">
                ${post.tags.map((t) => `<a class="tag ${tagClass(t)}" href="index.html?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}
              </div>
            </div>
          </header>

          <div class="prose" id="post-content">${html}</div>

          <!-- Barra de interacción (Like interactivo y vistas) -->
          <div class="post-actions-bar">
            <div class="post-actions-left">
              <button type="button" class="post-like-btn${isLiked ? ' is-liked' : ''}" id="post-like-btn" aria-label="Dar me gusta" aria-pressed="${isLiked}">
                <svg class="like-icon" width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                <span class="like-text">${isLiked ? 'Te gusta' : 'Me gusta'}</span>
                <span class="like-count" id="post-like-count">${currentLikes}</span>
              </button>

              <span class="post-views-badge" title="Vistas registradas">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <span id="post-views-val">${viewsCount}</span> vistas
              </span>
            </div>

            <button type="button" class="share-link" id="copy-post-link-bar">↗ Compartir</button>
          </div>

          <aside class="repo-card">
            <div class="repo-card-info">
              <span class="repo-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              </span>
              <div>
                <p class="repo-card-title">Z3K-Erick / DevBlog</p>
                <p class="repo-card-text">Repositorio con el código del maquetado y avances del proyecto</p>
              </div>
            </div>
            <a class="btn btn-secondary btn-sm" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">↗ Ver en GitHub</a>
          </aside>

          <footer class="post-footer">
            <a href="index.html" class="back-link" style="margin:0;">← Volver al feed principal</a>
            <a href="#top" class="btn btn-secondary btn-sm">↑ Volver arriba</a>
          </footer>
        </article>

        <aside class="post-aside">
          ${
            headings.length
              ? `<nav class="toc" aria-label="En este artículo">
                  <p class="aside-title">En este artículo</p>
                  <ol class="toc-list">
                    ${headings.map((h, i) => `<li><a class="toc-link${i === 0 ? ' is-active' : ''}" href="#${h.id}">${esc(h.text)}</a></li>`).join('')}
                  </ol>
                </nav>`
              : ''
          }
          <div class="aside-block">
            <p class="aside-title">Sobre este post</p>
            <p class="aside-note">Documentación de avances, diseño de componentes y pruebas en el proyecto.</p>
            <button type="button" class="share-link" id="copy-post-link">↗ Compartir enlace</button>
          </div>
        </aside>
      </div>`;

    // Manejo de Like interactivo
    const likeBtn = document.getElementById('post-like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        isLiked = !isLiked;
        localStorage.setItem(likedKey, String(isLiked));

        if (isLiked) {
          currentLikes += 1;
        } else {
          currentLikes = Math.max(0, currentLikes - 1);
        }

        likeBtn.classList.toggle('is-liked', isLiked);
        likeBtn.setAttribute('aria-pressed', String(isLiked));
        const svgIcon = likeBtn.querySelector('.like-icon');
        if (svgIcon) svgIcon.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        const textSpan = likeBtn.querySelector('.like-text');
        if (textSpan) textSpan.textContent = isLiked ? 'Te gusta' : 'Me gusta';
        const countSpan = document.getElementById('post-like-count');
        if (countSpan) countSpan.textContent = currentLikes;

        // Llamada silenciosa a la API para persistir en backend
        const res = await Store.togglePostLike(post.id, isLiked);
        if (res && typeof res.likes === 'number') {
          currentLikes = res.likes;
          if (countSpan) countSpan.textContent = currentLikes;
        }
      });
    }

    const shareAction = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast('Enlace copiado al portapapeles', 'success');
      } catch {
        toast('No se pudo copiar el enlace', 'error');
      }
    };
    document.getElementById('copy-post-link')?.addEventListener('click', shareAction);
    document.getElementById('copy-post-link-bar')?.addEventListener('click', shareAction);

    const links = [...document.querySelectorAll('.toc-link')];
    if (links.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
          });
        },
        { rootMargin: '-80px 0px -65% 0px' }
      );
      headings.forEach((h) => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });
    }
  }

  window.addEventListener('devblog:synced', renderPostPage);
  renderPostPage();
})();
