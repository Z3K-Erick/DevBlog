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
   * Caja de publicación rápida ("Crear nueva publicación")
   * ------------------------------------------------------------- */
  const composer = $('#composer');
  const composerTags = UI.TagInput($('#composer-tags'), ['React', 'UI/UX', 'Proyecto']);
  const imageInput = $('#composer-image-url');
  const fileInput = $('#composer-image-file');

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      state.composerImage = await UI.readImage(file);
      imageInput.value = `Imagen cargada: ${file.name}`;
      UI.toast('Imagen lista para publicar', 'success');
    } catch (error) {
      UI.toast(error.message, 'error');
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

    const created = Store.create({
      title,
      content: content || title,
      tags: composerTags.get(),
      image: cover,
      status,
    });

    if (!created) {
      UI.toast('No se pudo guardar la publicación.', 'error');
      return;
    }

    composer.reset();
    composerTags.clear();
    state.composerImage = '';
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
   * Mi Feed: tarjetas y Edición en Caliente
   * ------------------------------------------------------------- */
  const myPosts = $('#my-posts');

  function hotEditCard(post) {
    const media = post.image
      ? `<div class="post-card-media"><img src="${esc(post.image)}" alt=""></div>`
      : '';
    return `
      <article class="post-card post-card--row post-card--editing" data-id="${esc(post.id)}">
        ${media}
        <form class="post-card-body edit-form" data-edit-form novalidate>
          <div class="post-card-top">
            <span class="status status--editing">EDITANDO EN CALIENTE</span>
            <div class="post-card-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-action="cancel">${UI.Icons.edit}<span>Editar</span></button>
              <button type="button" class="btn btn-secondary btn-sm btn-danger-soft" data-action="delete" data-id="${esc(post.id)}">${UI.Icons.trash}<span>Eliminar</span></button>
            </div>
          </div>
          <p class="post-kicker">MODO EDICIÓN · CAMBIOS SIN GUARDAR</p>
          <label class="visually-hidden" for="edit-title">Título</label>
          <input class="input input--hot" id="edit-title" name="title" value="${esc(post.title)}" required>
          <label class="visually-hidden" for="edit-content">Contenido</label>
          <textarea class="input textarea textarea--hot" id="edit-content" name="content" rows="4">${esc(post.content)}</textarea>
          <div class="form-grid-2">
            <div class="field">
              <label class="label">Tipo</label>
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
          <div class="field">
            <label class="label">Imagen de portada (URL o ruta)</label>
            <input class="input select--sm" name="image" value="${esc(post.image || '')}" placeholder="assets/images/thumb-design.svg">
          </div>
          <div data-edit-tags></div>
          <div class="edit-form-footer">
            <div class="edit-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
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
      }
    }
  }

  function startEditing(id) {
    state.editingId = id;
    renderMyPosts();
    const card = myPosts.querySelector(`[data-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.querySelector('input[name="title"]')?.focus({ preventScroll: true });
  }

  function stopEditing() {
    state.editingId = null;
    state.editTags = null;
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

    Store.update(state.editingId, {
      title,
      content: form.content.value.trim(),
      kind: form.kind?.value || 'Proyecto',
      status: form.status?.value || 'publicado',
      image: form.image ? form.image.value.trim() : undefined,
      tags: state.editTags ? state.editTags.get() : undefined,
    });

    state.editingId = null;
    state.editTags = null;
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
  }

  renderAll();
  setTab(location.hash.slice(1) || 'mi-feed');
})();
