/**
 * DevBlog — Lógica del Dashboard Privado (dashboard.html)
 * ---------------------------------------------------------------
 * - Pestaña 1: "Mi Feed" (creación rápida + edición en caliente).
 * - Pestaña 2: "Gestor de Publicaciones" (tabla con filtros y borrado).
 */
(function () {
  'use strict';

  const { Store, Auth, Utils } = window.DevBlog;
  const UI = window.UI;
  const esc = Utils.escapeHtml;

  if (!Auth.isAdmin()) {
    window.location.replace('index.html');
    return;
  }

  const TABS = {
    'mi-feed': {
      title: 'Mi Feed',
      subtitle: 'Tu muro privado para publicar avances rápidos y editar tus posts en caliente.',
    },
    gestor: {
      title: 'Gestor de Publicaciones',
      subtitle: 'Administra, filtra y edita todas las entradas de tu blog.',
    },
    perfil: {
      title: 'Perfil y Barra Lateral',
      subtitle: 'Edita tu tarjeta de perfil, las tecnologías del filtro y la sección En construcción.',
    },
  };

  const state = {
    tab: 'mi-feed',
    editingId: null,
    composerImage: '',
    editCoverImage: '',
    modalPendingImage: '',
    editTags: null,
    dashTechEditor: null,
    dashProjectsDraft: null,
  };

  const $ = (sel) => document.querySelector(sel);

  /* ---------------------------------------------------------------
   * Cambio entre "Mi Feed" y "Gestor de Publicaciones"
   * ------------------------------------------------------------- */
  function setTab(name) {
    state.tab = TABS[name] ? name : 'mi-feed';
    const info = TABS[state.tab];

    $('#dash-title').textContent = info.title;
    $('#dash-subtitle').textContent = info.subtitle;
    $('#dash-crumb').textContent = info.title;
    document.title = `${info.title} — {EG} DevBlog`;

    const actionBtn = $('#header-action-btn');
    if (actionBtn) {
      if (state.tab === 'gestor') {
        actionBtn.textContent = '+ Nueva publicación';
        actionBtn.className = 'btn btn-primary btn-sm';
      } else {
        actionBtn.textContent = 'Vista de Administrador';
        actionBtn.className = 'admin-mode-pill';
      }
    }

    document.querySelectorAll('[data-tab]').forEach((el) => {
      const active = el.dataset.tab === state.tab;
      el.classList.toggle('is-active', active);
      if (el.getAttribute('role') === 'tab') el.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.hidden = panel.id !== `panel-${state.tab}`;
    });

    if (state.tab === 'gestor') renderTable();
    if (state.tab === 'perfil') renderProfileTab();
  }

  window.addEventListener('hashchange', () => setTab(location.hash.slice(1)));

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (btn.tagName === 'BUTTON') {
        e.preventDefault();
        location.hash = btn.dataset.tab;
        setTab(btn.dataset.tab);
      }
    });
  });

  /* ---------------------------------------------------------------
   * Editor Visual Asistido: funciones y utilidades
   * ------------------------------------------------------------- */
  let activeTextareaForModal = null;
  let savedCursorPos = null;

  function insertFormatting(textarea, prefix, suffix, defaultText) {
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);
    const insert = selected.length > 0 ? selected : defaultText;
    const replacement = prefix + insert + suffix;

    if (typeof textarea.setRangeText === 'function') {
      textarea.setRangeText(replacement, start, end, 'select');
      const newStart = start + prefix.length;
      const newEnd = newStart + insert.length;
      textarea.setSelectionRange(newStart, newEnd);
    } else {
      textarea.value = val.substring(0, start) + replacement + val.substring(end);
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function initEditorShell(shellEl) {
    if (!shellEl || shellEl.dataset.initialized) return;
    shellEl.dataset.initialized = 'true';

    const textarea = shellEl.querySelector('.editor-textarea');
    const previewEl = shellEl.querySelector('.editor-preview');
    const cheatsheet = shellEl.querySelector('.editor-cheatsheet');
    const helpBtn = shellEl.querySelector('[data-toggle-help]');
    const tabBtns = shellEl.querySelectorAll('[data-editor-mode]');
    const toolBtns = shellEl.querySelectorAll('[data-tool]');

    // Toggle ayuda / guía de formato
    helpBtn?.addEventListener('click', () => {
      if (cheatsheet) cheatsheet.hidden = !cheatsheet.hidden;
    });

    // Pestañas Escribir / Vista previa
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.editorMode;
        tabBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        if (mode === 'preview') {
          const md = window.DevBlog?.Markdown || window.Markdown;
          const content = textarea.value.trim();
          previewEl.innerHTML = content && md ? md.render(content).html : '';
          previewEl.hidden = false;
          textarea.hidden = true;
        } else {
          previewEl.hidden = true;
          textarea.hidden = false;
          textarea.focus();
        }
      });
    });

    // Botones de formato
    toolBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tool = btn.dataset.tool;
        if (tool === 'h2') {
          insertFormatting(textarea, '\n\n## ', '\n', '01. Título de sección');
        } else if (tool === 'h3') {
          insertFormatting(textarea, '\n\n### ', '\n', 'Subtítulo');
        } else if (tool === 'bold') {
          insertFormatting(textarea, '**', '**', 'texto en negrita');
        } else if (tool === 'italic') {
          insertFormatting(textarea, '*', '*', 'texto en cursiva');
        } else if (tool === 'code') {
          insertFormatting(textarea, '\n\n```js\n', '\n```\n', '// Escribe tu código o avance aquí');
        } else if (tool === 'tip') {
          insertFormatting(textarea, '\n\n> **LO QUE APRENDÍ:** ', '\n', 'Escribe aquí la conclusión clave o aprendizaje...');
        } else if (tool === 'list') {
          insertFormatting(textarea, '\n- ', '\n- Elemento 2\n- Elemento 3\n', 'Elemento 1');
        } else if (tool === 'image') {
          openImageInsertModal(textarea);
        }
      });
    });
  }

  function renderEditorShell({ textareaId, textareaName, content = '', placeholder = '', rows = 6 }) {
    return `
      <div class="editor-shell" data-editor-shell>
        <div class="editor-header-tabs">
          <div class="editor-tab-group">
            <button type="button" class="editor-mode-btn is-active" data-editor-mode="write">✏️ Escribir</button>
            <button type="button" class="editor-mode-btn" data-editor-mode="preview">👁️ Vista previa</button>
          </div>
          <button type="button" class="editor-help-toggle" data-toggle-help>💡 Ayuda de formato</button>
        </div>

        <div class="editor-cheatsheet" hidden>
          <div class="cheat-col">
            <strong>Encabezados</strong>
            <code>## 01. Título</code> (sección)<br>
            <code>### Subtítulo</code>
          </div>
          <div class="cheat-col">
            <strong>Texto y notas</strong>
            <code>**negrita**</code> · <code>*cursiva*</code><br>
            <code>&gt; **LO QUE APRENDÍ:**</code>
          </div>
          <div class="cheat-col">
            <strong>Código e imágenes</strong>
            <code>\`\`\`js archivo.js</code><br>
            <code>![Pie de foto](imagen.png)</code>
          </div>
        </div>

        <div class="editor-toolbar">
          <button type="button" class="tool-btn" data-tool="h2" title="Título de sección">🔤 Título H2</button>
          <button type="button" class="tool-btn" data-tool="h3" title="Subtítulo">📝 Subtítulo H3</button>
          <span class="tool-sep"></span>
          <button type="button" class="tool-btn tool-btn--bold" data-tool="bold" title="Negrita">B</button>
          <button type="button" class="tool-btn tool-btn--italic" data-tool="italic" title="Cursiva">I</button>
          <button type="button" class="tool-btn" data-tool="code" title="Bloque de código">💻 Código</button>
          <button type="button" class="tool-btn tool-btn--tip" data-tool="tip" title="Recuadro de aprendizaje">💡 Tip</button>
          <button type="button" class="tool-btn" data-tool="list" title="Lista">• Lista</button>
          <span class="tool-sep"></span>
          <button type="button" class="tool-btn tool-btn--image" data-tool="image" title="Insertar imagen exactamente en la posición del cursor">
            📷 + Insertar imagen aquí
          </button>
        </div>

        <textarea class="editor-textarea" id="${esc(textareaId)}" name="${esc(textareaName)}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(content)}</textarea>
        <div class="editor-preview prose" hidden></div>
      </div>
    `;
  }

  function updateCoverPreviewCard(containerEl, imgUrl, onRemove) {
    if (!containerEl) return;
    if (!imgUrl) {
      containerEl.hidden = true;
      containerEl.innerHTML = '';
      return;
    }
    containerEl.hidden = false;
    containerEl.innerHTML = `
      <img src="${esc(imgUrl)}" class="cover-preview-thumb" alt="Portada">
      <div class="cover-preview-info">
        <div class="cover-preview-title">Portada seleccionada</div>
        <div class="cover-preview-hint">Se mostrará en la tarjeta del post</div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-remove-cover>Quitar</button>
    `;
    containerEl.querySelector('[data-remove-cover]')?.addEventListener('click', onRemove);
  }

  /* ---------------------------------------------------------------
   * Modal: Insertar Imagen en el Texto (posición exacta del cursor)
   * ------------------------------------------------------------- */
  const insertImgModal = $('#insert-image-modal');
  const insertImgForm = $('#insert-image-form');
  const insertImgFile = $('#input-modal-img-file');
  const insertImgBrowse = $('#btn-browse-insert-img');
  const insertImgUrl = $('#modal-input-img-url');
  const insertImgCaption = $('#modal-input-caption');
  const insertImgPreviewBox = $('#modal-img-preview-box');
  const insertImgPreviewTag = $('#modal-preview-img-tag');
  const insertImgStatus = $('#modal-img-status');

  function openImageInsertModal(textarea) {
    activeTextareaForModal = textarea;
    savedCursorPos = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
    if (!insertImgModal) return;
    insertImgForm?.reset();
    state.modalPendingImage = '';
    if (insertImgPreviewBox) insertImgPreviewBox.hidden = true;
    if (insertImgPreviewTag) insertImgPreviewTag.src = '';
    if (insertImgStatus) insertImgStatus.textContent = 'PNG, JPG, SVG o WebP';
    insertImgModal.hidden = false;
    void insertImgModal.offsetWidth;
    insertImgModal.classList.add('is-open');
    document.body.classList.add('has-modal');
    insertImgBrowse?.focus();
  }

  function closeImageInsertModal() {
    if (!insertImgModal) return;
    insertImgModal.classList.remove('is-open');
    document.body.classList.remove('has-modal');
    setTimeout(() => {
      insertImgModal.hidden = true;
    }, 160);
    if (activeTextareaForModal) {
      activeTextareaForModal.focus();
    }
  }

  insertImgBrowse?.addEventListener('click', () => insertImgFile?.click());

  insertImgFile?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      insertImgStatus.textContent = `Cargando ${file.name}...`;
      const dataUrl = await UI.readImage(file);
      state.modalPendingImage = dataUrl;
      if (insertImgPreviewTag) insertImgPreviewTag.src = dataUrl;
      if (insertImgPreviewBox) insertImgPreviewBox.hidden = false;
      insertImgStatus.textContent = `Archivo listo: ${file.name}`;
      if (!insertImgCaption.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        insertImgCaption.value = cleanName;
      }
    } catch (err) {
      UI.toast(err.message, 'error');
      insertImgStatus.textContent = 'Error al leer el archivo';
    }
  });

  insertImgUrl?.addEventListener('input', () => {
    const val = insertImgUrl.value.trim();
    if (val && !state.modalPendingImage) {
      if (insertImgPreviewTag) insertImgPreviewTag.src = val;
      if (insertImgPreviewBox) insertImgPreviewBox.hidden = false;
    } else if (!val && !state.modalPendingImage) {
      if (insertImgPreviewBox) insertImgPreviewBox.hidden = true;
    }
  });

  insertImgForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const finalUrl = state.modalPendingImage || insertImgUrl.value.trim();
    if (!finalUrl) {
      UI.toast('Por favor selecciona una imagen o escribe una URL.', 'error');
      return;
    }
    const caption = insertImgCaption.value.trim() || 'Captura de avance';
    const mdSnippet = `\n\n![${caption}](${finalUrl})\n\n`;

    if (activeTextareaForModal) {
      const tx = activeTextareaForModal;
      tx.focus();
      const start = savedCursorPos ? savedCursorPos.start : tx.selectionStart;
      const end = savedCursorPos ? savedCursorPos.end : tx.selectionEnd;
      if (typeof tx.setRangeText === 'function') {
        tx.setRangeText(mdSnippet, start, end, 'end');
      } else {
        tx.value = tx.value.substring(0, start) + mdSnippet + tx.value.substring(end);
      }
      tx.dispatchEvent(new Event('input', { bubbles: true }));
    }

    closeImageInsertModal();
    UI.toast('¡Imagen insertada en la posición del cursor!', 'success');
  });

  insertImgModal?.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', closeImageInsertModal);
  });
  insertImgModal?.addEventListener('mousedown', (e) => {
    if (e.target === insertImgModal) closeImageInsertModal();
  });

  /* ---------------------------------------------------------------
   * Caja de publicación rápida ("Crear nueva publicación")
   * ------------------------------------------------------------- */
  const composer = $('#composer');
  const composerEditorShell = $('#composer-editor-shell');
  if (composerEditorShell) initEditorShell(composerEditorShell);

  const composerTags = UI.TagInput($('#composer-tags'), ['React', 'UI/UX', 'Proyecto']);
  const imageInput = $('#composer-image-url');
  const fileInput = $('#composer-image-file');
  const composerCoverPreview = $('#composer-cover-preview');

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      state.composerImage = await UI.readImage(file);
      imageInput.value = `Imagen cargada: ${file.name}`;
      updateCoverPreviewCard(composerCoverPreview, state.composerImage, () => {
        state.composerImage = '';
        imageInput.value = '';
        updateCoverPreviewCard(composerCoverPreview, '');
      });
      UI.toast('Imagen de portada lista para publicar', 'success');
    } catch (error) {
      UI.toast(error.message, 'error');
    }
  });

  imageInput?.addEventListener('input', () => {
    const val = imageInput.value.trim();
    if (!state.composerImage && val) {
      updateCoverPreviewCard(composerCoverPreview, val, () => {
        imageInput.value = '';
        updateCoverPreviewCard(composerCoverPreview, '');
      });
    } else if (!val && !state.composerImage) {
      updateCoverPreviewCard(composerCoverPreview, '');
    }
  });

  function submitComposer(status) {
    const title = composer.title.value.trim();
    const content = composer.content.value.trim();

    if (!title) {
      UI.toast('Escribe un título para tu publicación.', 'error');
      composer.title.focus();
      return;
    }

    const rawUrl = imageInput.value.trim();
    const cover =
      state.composerImage ||
      (rawUrl && !rawUrl.startsWith('Imagen cargada:') ? rawUrl : '');

    const layout = composer.layout ? composer.layout.value : 'side';
    const kind = composer.kind ? composer.kind.value : 'Proyecto';

    const created = Store.create({
      title,
      content: content || title,
      tags: composerTags.get(),
      image: cover,
      layout,
      kind,
      status,
    });

    if (!created) {
      UI.toast('No se pudo guardar la publicación.', 'error');
      return;
    }

    composer.reset();
    composerTags.clear();
    state.composerImage = '';
    updateCoverPreviewCard(composerCoverPreview, '');
    renderAll();
    UI.toast(
      status === 'publicado' ? '¡Avance publicado en el feed!' : 'Guardado como borrador.',
      'success'
    );
  }

  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    submitComposer('publicado');
  });

  $('#composer-draft')?.addEventListener('click', () => submitComposer('borrador'));

  // Botón para cancelar / limpiar la publicación que se está redactando
  $('#composer-cancel')?.addEventListener('click', () => {
    composer.reset();
    composerTags.set([]);
    state.composerImage = '';
    updateCoverPreviewCard(composerCoverPreview, '');
    UI.toast('Publicación cancelada');
  });

  // Subir y actualizar foto de perfil del administrador
  $('#avatar-upload-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await UI.readImage(file, 400);
      if (Store.setAvatar(dataUrl)) {
        UI.syncAvatars();
        UI.toast('Foto de perfil actualizada', 'success');
      } else {
        UI.toast('No se pudo guardar la foto de perfil', 'error');
      }
    } catch (error) {
      UI.toast(error.message, 'error');
    }
  });

  /* ---------------------------------------------------------------
   * Mi Feed: tarjetas y Edición en Caliente con Editor Asistido
   * ------------------------------------------------------------- */
  const myPosts = $('#my-posts');

  function hotEditCard(post) {
    const isTop = post.layout === 'top';
    const media = post.image
      ? `<div class="post-card-media"><img src="${esc(post.image)}" alt=""></div>`
      : '';
    return `
      <article class="post-card ${isTop ? 'post-card--featured' : 'post-card--row'} post-card--editing" data-id="${esc(post.id)}">
        ${media}
        <form class="post-card-body edit-form" data-edit-form novalidate>
          <div class="post-card-top">
            <span class="status status--editing">EDITANDO EN CALIENTE</span>
            <div class="post-card-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancel">${UI.Icons.edit}<span>Cerrar</span></button>
              <button type="button" class="btn btn-secondary btn-sm btn-danger-soft" data-action="delete" data-id="${esc(post.id)}">${UI.Icons.trash}<span>Eliminar</span></button>
            </div>
          </div>
          <p class="post-kicker">MODO EDICIÓN · CAMBIOS SIN GUARDAR</p>

          <div class="field">
            <label class="label" for="edit-title">Título de la publicación</label>
            <input class="input input--hot" id="edit-title" name="title" value="${esc(post.title)}" required>
          </div>

          <div class="field">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <label class="label" for="edit-content">Contenido de la publicación</label>
              <span class="muted" style="font-size: 0.74rem;">Usa los botones para dar formato o insertar imágenes</span>
            </div>
            ${renderEditorShell({
              textareaId: 'edit-content',
              textareaName: 'content',
              content: post.content,
              placeholder: 'Escribe el contenido de tu avance o práctica...',
              rows: 8,
            })}
          </div>

          <div class="form-grid-2">
            <div class="field">
              <label class="label">Tipo de publicación</label>
              <select class="input select select--sm" name="kind">
                <option value="Proyecto"${post.kind === 'Proyecto' ? ' selected' : ''}>Proyecto</option>
                <option value="Nota"${post.kind === 'Nota' ? ' selected' : ''}>Nota</option>
                <option value="Guía"${post.kind === 'Guía' ? ' selected' : ''}>Guía</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Estado</label>
              <select class="input select select--sm" name="status">
                <option value="publicado"${post.status === 'publicado' ? ' selected' : ''}>Publicado</option>
                <option value="borrador"${post.status === 'borrador' ? ' selected' : ''}>Borrador</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="field">
              <label class="label">Posición de la portada</label>
              <select class="input select select--sm" name="layout" id="edit-layout">
                <option value="side"${post.layout !== 'top' ? ' selected' : ''}>A un costado (Recomendado)</option>
                <option value="top"${post.layout === 'top' ? ' selected' : ''}>Arriba (Banner panorámico)</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Imagen de portada</label>
              <div class="input-file-group">
                <input class="input select--sm" name="image" id="edit-image-url" value="${esc(post.image || '')}" placeholder="assets/images/... o https://...">
                <label class="btn btn-secondary btn-sm" style="margin:0; white-space:nowrap; cursor:pointer;">
                  📁 Subir
                  <input type="file" id="edit-image-file" accept="image/*" class="visually-hidden">
                </label>
              </div>
            </div>
          </div>

          <div class="cover-preview-card" id="edit-cover-preview" ${post.image ? '' : 'hidden'}>
            ${
              post.image
                ? `<img src="${esc(post.image)}" class="cover-preview-thumb" alt="Portada">
                   <div class="cover-preview-info">
                     <div class="cover-preview-title">Portada actual</div>
                     <div class="cover-preview-hint">Se mostrará según la posición elegida</div>
                   </div>
                   <button type="button" class="btn btn-secondary btn-sm" data-remove-cover>Quitar</button>`
                : ''
            }
          </div>

          <div class="field">
            <label class="label">Etiquetas</label>
            <div data-edit-tags></div>
          </div>

          <div class="edit-form-footer">
            <div class="edit-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">💾 Guardar cambios</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancel">Cancelar</button>
            </div>
            <span class="muted">Editando directamente en el feed</span>
          </div>
        </form>
      </article>`;
  }

  function renderMyPosts() {
    const posts = Store.all();
    $('#my-posts-count').textContent = `${posts.length} ${posts.length === 1 ? 'publicación' : 'publicaciones'}`;

    if (!posts.length) {
      myPosts.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title">No hay publicaciones todavía</p>
          <p>Usa la caja superior para publicar tu primer avance.</p>
        </div>`;
      return;
    }

    myPosts.innerHTML = posts
      .map((p) =>
        p.id === state.editingId ? hotEditCard(p) : UI.postCard(p, { variant: 'row', admin: true })
      )
      .join('');

    const form = state.editingId && myPosts.querySelector('[data-edit-form]');
    if (form) {
      const post = posts.find((p) => p.id === state.editingId);
      if (post) {
        state.editTags = UI.TagInput(form.querySelector('[data-edit-tags]'), post.tags);

        // Inicializar editor visual asistido en la tarjeta caliente
        const editShell = form.querySelector('[data-editor-shell]');
        if (editShell) initEditorShell(editShell);

        // Portada y preview en edición caliente
        const editImgUrl = form.querySelector('#edit-image-url');
        const editImgFile = form.querySelector('#edit-image-file');
        const editPreview = form.querySelector('#edit-cover-preview');

        editPreview?.querySelector('[data-remove-cover]')?.addEventListener('click', () => {
          if (editImgUrl) editImgUrl.value = '';
          state.editCoverImage = '';
          updateCoverPreviewCard(editPreview, '');
        });

        editImgFile?.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          e.target.value = '';
          if (!file) return;
          try {
            const dataUrl = await UI.readImage(file);
            state.editCoverImage = dataUrl;
            if (editImgUrl) editImgUrl.value = `Imagen cargada: ${file.name}`;
            updateCoverPreviewCard(editPreview, dataUrl, () => {
              state.editCoverImage = '';
              if (editImgUrl) editImgUrl.value = '';
              updateCoverPreviewCard(editPreview, '');
            });
            UI.toast('Portada cargada para la publicación', 'success');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });

        editImgUrl?.addEventListener('input', () => {
          const val = editImgUrl.value.trim();
          if (!state.editCoverImage && val) {
            updateCoverPreviewCard(editPreview, val, () => {
              editImgUrl.value = '';
              updateCoverPreviewCard(editPreview, '');
            });
          } else if (!val && !state.editCoverImage) {
            updateCoverPreviewCard(editPreview, '');
          }
        });
      }
    }
  }

  function startEditing(id) {
    state.editingId = id;
    state.editCoverImage = '';
    renderMyPosts();
    const card = myPosts.querySelector(`[data-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.querySelector('input[name="title"]')?.focus({ preventScroll: true });
  }

  function stopEditing() {
    state.editingId = null;
    state.editTags = null;
    state.editCoverImage = '';
    renderMyPosts();
  }

  async function deletePost(id) {
    const post = Store.get(id);
    if (!post) return;
    const confirmed = await UI.confirmDelete(post.title);
    if (!confirmed) return;
    if (Store.remove(id)) {
      if (state.editingId === id) state.editingId = null;
      renderAll();
      UI.toast('Publicación eliminada permanentemente.', 'success');
    }
  }

  myPosts.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') startEditing(id);
    else if (action === 'delete') deletePost(id);
    else if (action === 'cancel') stopEditing();
  });

  myPosts.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-edit-form]');
    if (!form) return;
    e.preventDefault();

    const title = form.title.value.trim();
    if (!title) {
      UI.toast('El título no puede estar vacío.', 'error');
      form.title.focus();
      return;
    }

    const rawUrl = form.image ? form.image.value.trim() : '';
    const cover =
      state.editCoverImage ||
      (rawUrl && !rawUrl.startsWith('Imagen cargada:') ? rawUrl : (rawUrl === '' ? '' : undefined));

    Store.update(state.editingId, {
      title,
      content: form.content.value.trim(),
      kind: form.kind?.value || 'Proyecto',
      status: form.status?.value || 'publicado',
      layout: form.layout?.value || 'side',
      image: cover,
      tags: state.editTags ? state.editTags.get() : undefined,
    });

    state.editingId = null;
    state.editTags = null;
    state.editCoverImage = '';
    renderAll();
    UI.toast('Publicación actualizada.', 'success');
  });

  /* ---------------------------------------------------------------
   * Gestor de Publicaciones (Tabla)
   * ------------------------------------------------------------- */
  const filters = {
    search: $('#table-search'),
    status: $('#table-status'),
    category: $('#table-category'),
    sort: $('#table-sort'),
  };

  function renderTable() {
    const all = Store.all();
    let posts = all;

    const q = Utils.normalizeText(filters.search?.value.trim() || '');
    if (q) {
      posts = posts.filter((p) =>
        Utils.normalizeText(`${p.title} ${p.kind} ${p.tags.join(' ')}`).includes(q)
      );
    }
    if (filters.status && filters.status.value !== 'todos') {
      posts = posts.filter((p) => p.status === filters.status.value);
    }
    if (filters.category && filters.category.value !== 'todas') {
      posts = posts.filter(
        (p) => Utils.normalizeText(p.kind) === Utils.normalizeText(filters.category.value)
      );
    }
    if (filters.sort?.value === 'oldest') {
      posts = [...posts].reverse();
    }

    $('#table-summary').textContent = `${all.length} en total`;

    const body = $('#table-body');
    $('#table-empty').hidden = posts.length > 0;
    body.innerHTML = posts
      .map(
        (p) => `
        <tr>
          <td>
            <a class="table-title" href="post.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a>
          </td>
          <td class="muted">${esc(p.kind || 'Proyecto')} / ${esc(p.category)}</td>
          <td class="nowrap muted">${Utils.formatDate(p.date)}</td>
          <td>${UI.statusBadge(p.status)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(p.id)}">${UI.Icons.edit}<span>Editar</span></button>
              <button type="button" class="btn btn-secondary btn-sm btn-danger-soft" data-action="delete" data-id="${esc(p.id)}">${UI.Icons.trash}<span>Borrar</span></button>
            </div>
          </td>
        </tr>`
      )
      .join('');
  }

  Object.values(filters).forEach((el) => el?.addEventListener('input', renderTable));

  $('#table-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'delete') {
      deletePost(btn.dataset.id);
    } else if (btn.dataset.action === 'edit') {
      location.hash = 'mi-feed';
      setTab('mi-feed');
      startEditing(btn.dataset.id);
    }
  });

  $('#header-action-btn')?.addEventListener('click', () => {
    if (state.tab === 'gestor') {
      location.hash = 'mi-feed';
      setTab('mi-feed');
      composer.scrollIntoView({ behavior: 'smooth' });
      composer.title.focus();
    }
  });

  $('#logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'index.html';
  });

  /* ---------------------------------------------------------------
   * Pestaña 3: Perfil y Barra Lateral (Tarjeta perfil, Tecnologías, En construcción)
   * ------------------------------------------------------------- */
  function syncDashProjectsFromDOM() {
    const list = $('#dash-build-list');
    if (!list || !state.dashProjectsDraft) return;
    state.dashProjectsDraft = state.dashProjectsDraft.map((_, idx) => ({
      icon: list.querySelector(`[name="p-icon-${idx}"]`)?.value.trim() || '</>',
      name: list.querySelector(`[name="p-name-${idx}"]`)?.value.trim() || '',
      desc: list.querySelector(`[name="p-desc-${idx}"]`)?.value.trim() || '',
    }));
  }

  function renderDashProjectsList() {
    const list = $('#dash-build-list');
    if (!list || !state.dashProjectsDraft) return;
    list.innerHTML = state.dashProjectsDraft
      .map(
        (item, idx) => `
        <div class="build-edit-row" data-idx="${idx}">
          <input class="input select--sm build-icon-input" name="p-icon-${idx}" value="${esc(item.icon)}" placeholder="</>" aria-label="Icono">
          <div class="build-edit-fields">
            <input class="input select--sm" name="p-name-${idx}" value="${esc(item.name)}" placeholder="Nombre del proyecto" required>
            <input class="input select--sm" name="p-desc-${idx}" value="${esc(item.desc)}" placeholder="Descripción corta">
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-danger-soft" data-dash-remove-proj="${idx}">${UI.Icons.trash}</button>
        </div>`
      )
      .join('');
  }

  function renderProfileTab() {
    const cfg = Store.getSiteConfig();
    const pForm = $('#dash-profile-form');
    if (pForm) {
      pForm.name.value = cfg.profile.name || '';
      pForm.role.value = cfg.profile.role || '';
      pForm.bio.value = cfg.profile.bio || '';
      pForm.location.value = cfg.profile.location || '';
      pForm.githubUrl.value = cfg.profile.githubUrl || '';
      const sideName = document.querySelector('.dash-user-name');
      if (sideName) sideName.textContent = cfg.profile.name || 'Erick';
    }

    const techRoot = $('#dash-tech-tags');
    if (techRoot) {
      state.dashTechEditor = UI.TagInput(techRoot, cfg.technologies);
    }

    state.dashProjectsDraft = cfg.projects.map((x) => ({ ...x }));
    renderDashProjectsList();
  }

  $('#dash-avatar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await UI.readImage(file, 400);
      if (Store.setAvatar(dataUrl)) {
        UI.syncAvatars();
        UI.toast('Foto de perfil actualizada', 'success');
      }
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  });

  $('#dash-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    Store.saveSiteConfig({
      profile: {
        name: f.name.value.trim() || 'Erick',
        role: f.role.value.trim() || 'Estudiante de Ingeniería · Dev',
        bio: f.bio.value.trim(),
        location: f.location.value.trim(),
        githubUrl: f.githubUrl.value.trim(),
      },
    });
    renderProfileTab();
    UI.toast('Tarjeta de perfil actualizada', 'success');
  });

  $('#dash-tech-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const tags = state.dashTechEditor ? state.dashTechEditor.get() : [];
    Store.saveSiteConfig({ technologies: tags });
    UI.toast('Tecnologías actualizadas', 'success');
  });

  $('#dash-add-project')?.addEventListener('click', () => {
    syncDashProjectsFromDOM();
    if (!state.dashProjectsDraft) state.dashProjectsDraft = [];
    state.dashProjectsDraft.push({ icon: '</>', name: 'Nuevo proyecto', desc: 'En desarrollo' });
    renderDashProjectsList();
  });

  $('#dash-build-list')?.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-dash-remove-proj]');
    if (!rm) return;
    syncDashProjectsFromDOM();
    state.dashProjectsDraft.splice(Number(rm.dataset.dashRemoveProj), 1);
    renderDashProjectsList();
  });

  $('#dash-build-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    syncDashProjectsFromDOM();
    const clean = (state.dashProjectsDraft || []).filter((x) => x.name);
    Store.saveSiteConfig({ projects: clean });
    renderDashProjectsList();
    UI.toast('Sección En construcción actualizada', 'success');
  });

  function renderAll() {
    renderMyPosts();
    renderTable();
    renderProfileTab();
    if (UI.syncAvatars) UI.syncAvatars();
  }

  window.addEventListener('devblog:synced', renderAll);
  renderAll();
  setTab(location.hash.slice(1) || 'mi-feed');
})();
