/**
 * DevBlog — Lógica del Feed Principal y Barra Lateral Editable (index.html)
 */
(function () {
  'use strict';

  const { Store, Auth, Utils } = window.DevBlog;
  const UI = window.UI;
  const { postCard, tagClass } = UI;
  const esc = Utils.escapeHtml;

  const PAGE_SIZE = 4;
  const params = new URLSearchParams(window.location.search);

  const state = {
    query: params.get('q') || '',
    kind: 'todos',
    tag: params.get('tag') || 'todos',
    sort: 'recent',
    visible: PAGE_SIZE,
    editingSidebar: null, // 'profile' | 'tech' | 'build' | null
    techEditor: null,
    buildDraft: null,
  };

  const els = {
    feed: document.getElementById('feed-list'),
    tabs: document.getElementById('feed-tabs'),
    sort: document.getElementById('feed-sort'),
    loadMore: document.getElementById('load-more'),
    status: document.getElementById('feed-status'),
    search: document.querySelector('#header-search input'),
    profileCard: document.getElementById('sidebar-profile-card'),
    techCard: document.getElementById('sidebar-tech-card'),
    buildCard: document.getElementById('sidebar-build-card'),
  };

  function getFiltered() {
    let posts = Store.published();

    if (state.kind !== 'todos') {
      const k = Utils.normalizeText(state.kind);
      posts = posts.filter((p) => Utils.normalizeText(p.kind).startsWith(k));
    }
    if (state.tag !== 'todos') {
      const t = state.tag.toLowerCase();
      posts = posts.filter((p) => p.tags.some((tag) => tag.toLowerCase() === t));
    }
    if (state.query) {
      const q = Utils.normalizeText(state.query);
      posts = posts.filter((p) =>
        Utils.normalizeText(`${p.title} ${p.excerpt} ${p.tags.join(' ')}`).includes(q)
      );
    }
    if (state.sort === 'oldest') posts = [...posts].reverse();
    return posts;
  }

  function renderFeed() {
    const posts = getFiltered();
    const shown = posts.slice(0, state.visible);

    if (!shown.length) {
      els.feed.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title">No se encontraron publicaciones</p>
          <p>Prueba seleccionando otra categoría o limpiando el filtro activo.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-reset>Mostrar todos los posts</button>
        </div>`;
    } else {
      els.feed.innerHTML = shown
        .map((post) =>
          postCard(post, { variant: post.layout === 'top' ? 'featured' : 'row' })
        )
        .join('');
    }

    if (els.status) {
      const parts = [];
      if (state.kind !== 'todos') parts.push(state.kind);
      if (state.tag !== 'todos') parts.push(`#${state.tag}`);
      if (state.query) parts.push(`“${state.query}”`);
      els.status.hidden = !parts.length;
      els.status.textContent = parts.length
        ? `Filtrando por ${parts.join(' · ')} (${posts.length})`
        : '';
    }
  }

  function renderTabs() {
    const kinds = [
      { id: 'todos', label: 'Todos los Posts' },
      { id: 'proyecto', label: 'Proyectos' },
      { id: 'nota', label: 'Notas' },
      { id: 'guia', label: 'Guías' },
    ];
    els.tabs.innerHTML = kinds
      .map(
        (k) =>
          `<button type="button" class="filter-tab${state.kind === k.id ? ' is-active' : ''}" data-kind="${k.id}">${k.label}</button>`
      )
      .join('');
  }

  /* ---------------------------------------------------------------
   * Sidebar editable por el Administrador
   * ------------------------------------------------------------- */
  function renderProfileCard(cfg, isAdmin) {
    if (!els.profileCard) return;
    const p = cfg.profile;

    if (isAdmin && state.editingSidebar === 'profile') {
      els.profileCard.innerHTML = `
        <form class="sidebar-edit-form" id="form-edit-profile" novalidate>
          <div class="sidebar-head">
            <h2 class="sidebar-title">Editar perfil</h2>
            <span class="status status--editing">Editando</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="profile-avatar-circle">
              <img src="${esc(Store.getAvatar())}" alt="Avatar" data-user-avatar>
            </div>
            <label class="btn btn-secondary btn-sm">
              📷 Cambiar foto
              <input type="file" id="inline-avatar-file" accept="image/*" class="visually-hidden">
            </label>
          </div>
          <div class="field">
            <label class="label">Nombre</label>
            <input class="input select--sm" name="name" value="${esc(p.name)}" required>
          </div>
          <div class="field">
            <label class="label">Descripción</label>
            <textarea class="input textarea" name="bio" rows="2" style="min-height:64px;">${esc(p.bio)}</textarea>
          </div>
          <div class="field">
            <label class="label">Ubicación</label>
            <input class="input select--sm" name="location" value="${esc(p.location)}">
          </div>
          <div class="field">
            <label class="label">URL de GitHub</label>
            <input class="input select--sm" name="githubUrl" value="${esc(p.githubUrl)}">
          </div>
          <div class="edit-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
            <button type="button" class="btn btn-secondary btn-sm" data-cancel-sidebar>Cancelar</button>
          </div>
        </form>`;
      return;
    }

    els.profileCard.innerHTML = `
      <div class="sidebar-card-top">
        <div class="profile-avatar-circle">
          <img src="${esc(Store.getAvatar())}" alt="Foto de perfil de ${esc(p.name)}" data-user-avatar>
        </div>
        ${isAdmin ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-sidebar="profile">${UI.Icons.edit}<span>Editar</span></button>` : ''}
      </div>
      <div class="profile-info">
        <p class="profile-name">${esc(p.name)}</p>
        <p class="profile-bio">${esc(p.bio)}</p>
      </div>
      ${p.location ? `<span class="profile-loc">📍 ${esc(p.location)}</span>` : ''}
      ${
        p.githubUrl
          ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              <span>${esc(p.githubLabel || 'GitHub')}</span>
            </a>`
          : ''
      }`;
  }

  function renderTechCard(cfg, isAdmin) {
    if (!els.techCard) return;

    if (isAdmin && state.editingSidebar === 'tech') {
      els.techCard.innerHTML = `
        <form class="sidebar-edit-form" id="form-edit-tech" novalidate>
          <div class="sidebar-head">
            <h2 class="sidebar-title">Editar tecnologías</h2>
            <span class="status status--editing">Editando</span>
          </div>
          <div id="sidebar-tech-editor"></div>
          <span class="form-hint">Escribe una tecnología y presiona Enter, o quita con ×</span>
          <div class="edit-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
            <button type="button" class="btn btn-secondary btn-sm" data-cancel-sidebar>Cancelar</button>
          </div>
        </form>`;
      state.techEditor = UI.TagInput(
        document.getElementById('sidebar-tech-editor'),
        cfg.technologies
      );
      return;
    }

    const counts = Store.tagCounts();
    const activeTag = state.tag.toLowerCase();

    els.techCard.innerHTML = `
      <div class="sidebar-head">
        <h2 class="sidebar-title">Filtrar por tecnología</h2>
        ${isAdmin ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-sidebar="tech">${UI.Icons.edit}<span>Editar</span></button>` : ''}
      </div>
      <div class="tech-filters">
        ${counts
          .map(
            ({ tag }) =>
              `<button type="button" class="tech-chip ${tagClass(tag)}${tag.toLowerCase() === activeTag ? ' is-active' : ''}" data-tag="${esc(tag)}">${esc(tag)}</button>`
          )
          .join('')}
      </div>`;
  }

  function renderBuildCard(cfg, isAdmin) {
    if (!els.buildCard) return;

    if (isAdmin && state.editingSidebar === 'build') {
      const items = state.buildDraft || cfg.projects.map((x) => ({ ...x }));
      state.buildDraft = items;

      els.buildCard.innerHTML = `
        <form class="sidebar-edit-form" id="form-edit-build" novalidate>
          <div class="sidebar-head">
            <h2 class="sidebar-title">Editar En construcción</h2>
            <span class="status status--editing">Editando</span>
          </div>
          <div class="build-edit-list">
            ${items
              .map(
                (item, idx) => `
              <div class="build-edit-row" data-idx="${idx}">
                <input class="input select--sm build-icon-input" name="icon-${idx}" value="${esc(item.icon)}" placeholder="</>" aria-label="Icono">
                <div class="build-edit-fields">
                  <input class="input select--sm" name="name-${idx}" value="${esc(item.name)}" placeholder="Nombre del proyecto" required>
                  <input class="input select--sm" name="desc-${idx}" value="${esc(item.desc)}" placeholder="Descripción corta">
                </div>
                <button type="button" class="icon-btn" data-remove-build="${idx}" aria-label="Quitar proyecto">${UI.Icons.trash}</button>
              </div>`
              )
              .join('')}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="add-build-item">+ Agregar proyecto</button>
          <div class="edit-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
            <button type="button" class="btn btn-secondary btn-sm" data-cancel-sidebar>Cancelar</button>
          </div>
        </form>`;
      return;
    }

    els.buildCard.innerHTML = `
      <div class="sidebar-head">
        <h2 class="sidebar-title">En construcción</h2>
        ${
          isAdmin
            ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-sidebar="build">${UI.Icons.edit}<span>Editar</span></button>`
            : '<span class="muted">↗</span>'
        }
      </div>
      <ul class="build-list">
        ${cfg.projects
          .map(
            (item) => `
          <li class="build-item">
            <span class="build-icon">${esc(item.icon || '</>')}</span>
            <div>
              <span class="build-name">${esc(item.name)}</span>
              <span class="build-desc">${esc(item.desc)}</span>
            </div>
          </li>`
          )
          .join('')}
      </ul>`;
  }

  function renderSidebar() {
    const cfg = Store.getSiteConfig();
    const isAdmin = Auth.isAdmin();
    renderProfileCard(cfg, isAdmin);
    renderTechCard(cfg, isAdmin);
    renderBuildCard(cfg, isAdmin);
  }

  function render() {
    renderTabs();
    renderFeed();
    renderSidebar();
  }

  function syncBuildDraftFromDOM() {
    const form = document.getElementById('form-edit-build');
    if (!form || !state.buildDraft) return;
    state.buildDraft = state.buildDraft.map((_, idx) => ({
      icon: form.querySelector(`[name="icon-${idx}"]`)?.value.trim() || '</>',
      name: form.querySelector(`[name="name-${idx}"]`)?.value.trim() || '',
      desc: form.querySelector(`[name="desc-${idx}"]`)?.value.trim() || '',
    }));
  }

  document.addEventListener('click', (e) => {
    const kindBtn = e.target.closest('[data-kind]');
    if (kindBtn) {
      state.kind = kindBtn.dataset.kind;
      state.visible = PAGE_SIZE;
      renderTabs();
      renderFeed();
      return;
    }

    const tagBtn = e.target.closest('[data-tag]');
    if (tagBtn) {
      const chosen = tagBtn.dataset.tag;
      state.tag = state.tag.toLowerCase() === chosen.toLowerCase() ? 'todos' : chosen;
      state.visible = PAGE_SIZE;
      renderFeed();
      renderSidebar();
      return;
    }

    const editBtn = e.target.closest('[data-edit-sidebar]');
    if (editBtn && Auth.isAdmin()) {
      state.editingSidebar = editBtn.dataset.editSidebar;
      state.buildDraft = null;
      renderSidebar();
      return;
    }

    if (e.target.closest('[data-cancel-sidebar]')) {
      state.editingSidebar = null;
      state.buildDraft = null;
      renderSidebar();
      return;
    }

    if (e.target.closest('#add-build-item')) {
      syncBuildDraftFromDOM();
      state.buildDraft.push({ icon: '</>', name: 'Nuevo proyecto', desc: 'En desarrollo' });
      renderSidebar();
      return;
    }

    const removeBuild = e.target.closest('[data-remove-build]');
    if (removeBuild) {
      syncBuildDraftFromDOM();
      state.buildDraft.splice(Number(removeBuild.dataset.removeBuild), 1);
      renderSidebar();
      return;
    }

    if (e.target.closest('[data-reset]')) {
      state.query = '';
      state.kind = 'todos';
      state.tag = 'todos';
      if (els.search) els.search.value = '';
      render();
    }
  });

  document.addEventListener('change', async (e) => {
    if (e.target.id === 'inline-avatar-file') {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const dataUrl = await UI.readImage(file, 400);
        Store.setAvatar(dataUrl);
        UI.syncAvatars();
        UI.toast('Foto de perfil actualizada', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'form-edit-profile') {
      e.preventDefault();
      const f = e.target;
      Store.saveSiteConfig({
        profile: {
          name: f.name.value.trim() || 'Erick',
          bio: f.bio.value.trim(),
          location: f.location.value.trim(),
          githubUrl: f.githubUrl.value.trim(),
        },
      });
      state.editingSidebar = null;
      renderSidebar();
      UI.toast('Perfil actualizado', 'success');
    } else if (e.target.id === 'form-edit-tech') {
      e.preventDefault();
      const tags = state.techEditor ? state.techEditor.get() : [];
      Store.saveSiteConfig({ technologies: tags });
      state.editingSidebar = null;
      renderSidebar();
      UI.toast('Tecnologías actualizadas', 'success');
    } else if (e.target.id === 'form-edit-build') {
      e.preventDefault();
      syncBuildDraftFromDOM();
      const clean = (state.buildDraft || []).filter((x) => x.name);
      Store.saveSiteConfig({ projects: clean });
      state.editingSidebar = null;
      state.buildDraft = null;
      renderSidebar();
      UI.toast('Sección En construcción actualizada', 'success');
    }
  });

  els.sort?.addEventListener('change', () => {
    state.sort = els.sort.value;
    renderFeed();
  });

  els.loadMore?.addEventListener('click', () => {
    state.visible += PAGE_SIZE;
    renderFeed();
    UI.toast('Mostrando todas las publicaciones disponibles');
  });

  if (els.search) {
    els.search.value = state.query;
    els.search.addEventListener('input', () => {
      state.query = els.search.value.trim();
      state.visible = PAGE_SIZE;
      renderFeed();
    });
  }

  window.addEventListener('storage', render);
  render();
})();
