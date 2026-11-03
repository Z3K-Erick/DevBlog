/**
 * DevBlog - Editor Logic (editor.html)
 * Formulario de creación/edición, generador de slugs, barra de herramientas Markdown,
 * sistema dinámico de etiquetas y vista previa en vivo.
 */

let currentTags = [];
let editingPostId = null;

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
});

function initEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  editingPostId = urlParams.get('id');

  // Si estamos editando un post existente
  if (editingPostId) {
    loadExistingPost(editingPostId);
  } else {
    // Post nuevo: tags por defecto
    currentTags = ['React', 'Frontend'];
    renderTags();
  }

  // Generador automático de slug en base al título
  const titleInput = document.getElementById('editor-title');
  const slugInput = document.getElementById('editor-slug');

  if (titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      if (!editingPostId || !slugInput.dataset.manual) {
        slugInput.value = BlogStore.generateSlug(titleInput.value);
      }
      updateLivePreview();
    });

    slugInput.addEventListener('change', () => {
      slugInput.dataset.manual = 'true';
    });
  }

  // Inputs adicionales para sincronizar con la vista previa
  const excerptInput = document.getElementById('editor-excerpt');
  const contentInput = document.getElementById('editor-content');
  const categoryInput = document.getElementById('editor-category');

  if (excerptInput) excerptInput.addEventListener('input', updateLivePreview);
  if (contentInput) contentInput.addEventListener('input', updateLivePreview);
  if (categoryInput) categoryInput.addEventListener('change', updateLivePreview);

  // Inicializar tags
  initTagInput();

  // Inicializar barra Markdown
  initMarkdownToolbar();

  // Guardar Borrador
  const saveDraftBtn = document.getElementById('btn-save-draft');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', (e) => {
      e.preventDefault();
      savePostForm('borrador');
    });
  }

  // Publicar Post
  const publishBtn = document.getElementById('btn-publish-post');
  if (publishBtn) {
    publishBtn.addEventListener('click', (e) => {
      e.preventDefault();
      savePostForm('publicado');
    });
  }

  updateLivePreview();
}

function loadExistingPost(id) {
  const post = BlogStore.getPostById(id);
  if (!post) {
    showToast('No se encontró la publicación a editar', 'error');
    return;
  }

  document.getElementById('editor-page-heading').innerText = 'Editar Publicación';
  document.getElementById('editor-title').value = post.title || '';
  document.getElementById('editor-slug').value = post.slug || '';
  document.getElementById('editor-category').value = post.category || 'React';
  document.getElementById('editor-readtime').value = post.readTime || '5 min de lectura';
  document.getElementById('editor-excerpt').value = post.excerpt || '';
  document.getElementById('editor-cover').value = post.coverImage || '';
  document.getElementById('editor-content').value = post.content || '';

  currentTags = post.tags ? [...post.tags] : [];
  renderTags();
  updateLivePreview();
}

// ==========================================================================
// GESTIÓN DE ETIQUETAS (TAGS)
// ==========================================================================
function initTagInput() {
  const tagInput = document.getElementById('tag-inline-input');
  if (!tagInput) return;

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.value.trim().replace(/^#/, '');
      if (val && !currentTags.includes(val)) {
        currentTags.push(val);
        renderTags();
        tagInput.value = '';
        updateLivePreview();
      }
    }
  });
}

function renderTags() {
  const container = document.getElementById('tags-list');
  if (!container) return;

  container.innerHTML = currentTags.map((tag, idx) => `
    <span class="tag-item">
      #${tag}
      <span class="tag-item-remove" onclick="removeTag(${idx})">×</span>
    </span>
  `).join('');
}

function removeTag(idx) {
  currentTags.splice(idx, 1);
  renderTags();
  updateLivePreview();
}

window.removeTag = removeTag;

// ==========================================================================
// BARRA DE HERRAMIENTAS MARKDOWN
// ==========================================================================
function initMarkdownToolbar() {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;

  document.querySelectorAll('[data-md-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mdAction;
      insertMarkdown(textarea, action);
      updateLivePreview();
    });
  });
}

function insertMarkdown(textarea, action) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);

  let replacement = '';
  switch (action) {
    case 'bold':
      replacement = `<strong>${selected || 'texto en negrita'}</strong>`;
      break;
    case 'italic':
      replacement = `<em>${selected || 'texto en cursiva'}</em>`;
      break;
    case 'h2':
      replacement = `\n<h2 id="seccion-${Date.now().toString().slice(-4)}">${selected || 'Título de sección'}</h2>\n`;
      break;
    case 'h3':
      replacement = `\n<h3>${selected || 'Subtítulo'}</h3>\n`;
      break;
    case 'code':
      replacement = `<code>${selected || 'código'}</code>`;
      break;
    case 'quote':
      replacement = `\n<blockquote>${selected || 'Cita destacada...'}</blockquote>\n`;
      break;
    case 'callout':
      replacement = `\n<div class="callout-box">\n  <div class="callout-icon">💡</div>\n  <div class="callout-content">\n    <h4>Tip</h4>\n    <p>${selected || 'Consejo o nota importante...'}</p>\n  </div>\n</div>\n`;
      break;
    case 'link':
      replacement = `<a href="https://ejemplo.com">${selected || 'enlace'}</a>`;
      break;
    case 'list':
      replacement = `\n<ul>\n  <li>${selected || 'Elemento 1'}</li>\n  <li>Elemento 2</li>\n</ul>\n`;
      break;
    default:
      replacement = selected;
  }

  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
}

// ==========================================================================
// VISTA PREVIA EN VIVO
// ==========================================================================
function updateLivePreview() {
  const previewBox = document.getElementById('live-preview-box');
  if (!previewBox) return;

  const title = document.getElementById('editor-title')?.value || 'Título del artículo';
  const category = document.getElementById('editor-category')?.value || 'React';
  const excerpt = document.getElementById('editor-excerpt')?.value || 'Extracto breve del artículo...';
  const content = document.getElementById('editor-content')?.value || '<p>Comienza a escribir tu contenido para previsualizarlo aquí...</p>';

  previewBox.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <span class="badge badge-react">${category}</span>
      ${currentTags.map(t => `<span class="badge badge-ui" style="margin-left: 0.35rem;">#${t}</span>`).join('')}
    </div>
    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem;">${title}</h2>
    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; border-left: 3px solid var(--border-color); padding-left: 0.75rem;">${excerpt}</p>
    <div class="article-body" style="font-size: 0.95rem;">
      ${content}
    </div>
  `;
}

// ==========================================================================
// GUARDAR / PUBLICAR POST
// ==========================================================================
function savePostForm(status) {
  const title = document.getElementById('editor-title').value.trim();
  if (!title) {
    showToast('El título es obligatorio', 'error');
    document.getElementById('editor-title').focus();
    return;
  }

  const postData = {
    id: editingPostId || ('post-' + Date.now()),
    title: title,
    slug: document.getElementById('editor-slug').value.trim() || BlogStore.generateSlug(title),
    category: document.getElementById('editor-category').value,
    readTime: document.getElementById('editor-readtime').value.trim() || '5 min de lectura',
    excerpt: document.getElementById('editor-excerpt').value.trim(),
    coverImage: document.getElementById('editor-cover').value.trim() || 'assets/images/kanban-preview.svg',
    tags: currentTags,
    status: status,
    content: document.getElementById('editor-content').value.trim()
  };

  BlogStore.savePost(postData);

  showToast(
    status === 'publicado' ? '¡Publicación publicada con éxito!' : 'Borrador guardado exitosamente', 
    'success'
  );

  setTimeout(() => {
    if (status === 'publicado') {
      window.location.href = `post.html?id=${postData.id}`;
    } else {
      window.location.href = 'admin.html';
    }
  }, 1000);
}
