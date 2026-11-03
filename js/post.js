/**
 * DevBlog — Lectura Completa / El Hilo (post.html)
 */
(function () {
  'use strict';

  const { Store, Auth, Utils, Markdown } = window.DevBlog;
  const { tagClass, toast } = window.UI;
  const esc = Utils.escapeHtml;

  const REPO_URL = 'https://github.com/Z3K-Erick/DevBlog';

  const root = document.getElementById('post-root');
  const id = new URLSearchParams(window.location.search).get('id');
  const post = id ? Store.get(id) : Store.published()[0] || Store.all()[0];
  const canView = post && (post.status === 'publicado' || Auth.isAdmin());

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

  const { html, headings } = Markdown.render(post.content);
  const kindLabel = (post.kind || 'Proyecto').toUpperCase();
  const dateLabel = Utils.formatDate(post.date).toUpperCase();

  root.innerHTML = `
    <a href="index.html" class="back-link">← Volver al feed</a>

    <div class="post-layout">
      <article class="post-article">
        ${post.status !== 'publicado' ? '<div class="draft-banner">Borrador — vista previa privada del autor.</div>' : ''}

        <header class="post-header">
          <p class="featured-kicker">${esc(kindLabel)} · PUBLICADO EL ${esc(dateLabel)} · ${esc(post.readTime.toUpperCase())}</p>
          <h1 class="post-title">${esc(post.title)}</h1>
          ${post.excerpt ? `<p class="post-lead">${esc(post.excerpt)}</p>` : ''}
          <div class="post-author">
            <img src="assets/images/avatar.svg" alt="Erick" class="post-author-avatar" width="36" height="36">
            <div>
              <span class="post-author-name">Erick</span>
              <span class="post-author-role">Estudiante de Ingeniería · Dev</span>
            </div>
            <div class="chip-list post-author-tags">
              ${post.tags.map((t) => `<a class="tag ${tagClass(t)}" href="index.html?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}
            </div>
          </div>
        </header>

        <div class="prose" id="post-content">${html}</div>

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

  document.getElementById('copy-post-link')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Enlace copiado al portapapeles', 'success');
    } catch {
      toast('No se pudo copiar el enlace', 'error');
    }
  });

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
})();
