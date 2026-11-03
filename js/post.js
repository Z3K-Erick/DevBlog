/**
 * DevBlog - Post Reader Logic (post.html)
 * Renderizado del artículo, Tabla de Contenidos interactiva (TOC),
 * copiado de código y botones de compartir.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});

function loadArticle() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const postSlug = urlParams.get('slug');

  let post = null;
  if (postId) {
    post = BlogStore.getPostById(postId);
  } else if (postSlug) {
    post = BlogStore.getPostBySlug(postSlug);
  } else {
    // Si no se pasa parámetro, cargar el primer artículo destacado
    post = BlogStore.getPosts()[0];
  }

  if (!post) {
    document.querySelector('.article-container').innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Artículo no encontrado</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">El artículo solicitado no existe o fue eliminado.</p>
        <a href="index.html" class="btn btn-primary">← Volver al blog</a>
      </div>
    `;
    return;
  }

  // Actualizar título de la página
  document.title = `${post.title} — DevBlog`;

  // Inyectar etiquetas
  const tagsContainer = document.getElementById('article-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = `
      <span class="badge badge-react">${post.category}</span>
      ${(post.tags || []).map(t => `<span class="badge badge-ui">${t}</span>`).join('')}
    `;
  }

  // Inyectar título
  const titleEl = document.getElementById('article-title');
  if (titleEl) titleEl.innerText = post.title;

  // Inyectar autor y metadatos
  const authorName = document.getElementById('article-author-name');
  if (authorName) authorName.innerText = post.author ? post.author.name : 'Erick';

  const authorRole = document.getElementById('article-author-role');
  if (authorRole) authorRole.innerText = post.author ? post.author.role : 'Frontend Developer';

  const authorAvatar = document.getElementById('article-author-avatar');
  if (authorAvatar && post.author) authorAvatar.src = post.author.avatar;

  const metaEl = document.getElementById('article-meta');
  if (metaEl) {
    metaEl.innerText = `Publicado el ${post.formattedDate} • ${post.readTime}`;
  }

  // Inyectar contenido
  const bodyEl = document.getElementById('article-content-body');
  if (bodyEl) {
    bodyEl.innerHTML = post.content;
  }

  // Generar Tabla de Contenidos (TOC) y activar ScrollSpy
  initTOC();

  // Configurar botones de compartir
  initShareButtons(post);
}

// Genera el TOC a partir de los encabezados h2 del artículo
function initTOC() {
  const headings = document.querySelectorAll('#article-content-body h2');
  const tocNav = document.getElementById('toc-navigation');
  if (!tocNav || headings.length === 0) return;

  tocNav.innerHTML = '';
  headings.forEach((h, index) => {
    if (!h.id) {
      h.id = `seccion-${index + 1}`;
    }

    const link = document.createElement('a');
    link.href = `#${h.id}`;
    link.className = 'toc-link';
    link.innerText = h.innerText;
    tocNav.appendChild(link);
  });

  // ScrollSpy con IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.toc-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    rootMargin: '-80px 0px -60% 0px'
  });

  headings.forEach(h => observer.observe(h));
}

// Copiar código del bloque al portapapeles
function copyCode(button) {
  const container = button.closest('.code-block-container');
  if (!container) return;

  const code = container.querySelector('code');
  if (!code) return;

  navigator.clipboard.writeText(code.innerText).then(() => {
    const originalText = button.querySelector('span').innerText;
    button.querySelector('span').innerText = '¡Copiado!';
    button.style.borderColor = 'var(--accent-emerald)';
    button.style.color = 'var(--accent-emerald)';

    showToast('Código copiado al portapapeles', 'success');

    setTimeout(() => {
      button.querySelector('span').innerText = originalText;
      button.style.borderColor = '';
      button.style.color = '';
    }, 2000);
  }).catch(() => {
    showToast('No se pudo copiar el código', 'error');
  });
}

window.copyCode = copyCode;

// Botones de compartir
function initShareButtons(post) {
  const currentUrl = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(post.title);

  // Botón copiar enlace
  const btnCopyLink = document.getElementById('share-btn-copy');
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Enlace copiado al portapapeles', 'success');
      });
    });
  }

  // Twitter
  const btnTwitter = document.getElementById('share-btn-twitter');
  if (btnTwitter) {
    btnTwitter.href = `https://twitter.com/intent/tweet?url=${currentUrl}&text=${title}`;
  }

  // LinkedIn
  const btnLinkedin = document.getElementById('share-btn-linkedin');
  if (btnLinkedin) {
    btnLinkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
  }
}
