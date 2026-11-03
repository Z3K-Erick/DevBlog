/**
 * DevBlog — Lógica del Feed Principal (index.html)
 */
(function () {
  'use strict';

  const { Store, Utils } = window.DevBlog;
  const { postCard, tagClass } = window.UI;
  const esc = Utils.escapeHtml;

  const PAGE_SIZE = 4;
  const params = new URLSearchParams(window.location.search);

  const state = {
    query: params.get('q') || '',
    kind: 'todos',
    tag: params.get('tag') || 'todos',
    sort: 'recent',
    visible: PAGE_SIZE,
  };

  const els = {
    feed: document.getElementById('feed-list'),
    tabs: document.getElementById('feed-tabs'),
    sort: document.getElementById('feed-sort'),
    loadMore: document.getElementById('load-more'),
    status: document.getElementById('feed-status'),
    search: document.querySelector('#header-search input'),
    techFilters: document.getElementById('tech-filters'),
  };

  const isDefaultView = () =>
    state.kind === 'todos' && state.tag === 'todos' && !state.query && state.sort === 'recent';

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

  function renderFilters() {
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

    const counts = Store.tagCounts();
    const activeTag = state.tag.toLowerCase();
    els.techFilters.innerHTML = counts
      .map(
        ({ tag }) =>
          `<button type="button" class="tech-chip ${tagClass(tag)}${tag.toLowerCase() === activeTag ? ' is-active' : ''}" data-tag="${esc(tag)}">${esc(tag)}</button>`
      )
      .join('');
  }

  function render() {
    renderFilters();
    renderFeed();
  }

  document.addEventListener('click', (e) => {
    const kindBtn = e.target.closest('[data-kind]');
    if (kindBtn) {
      state.kind = kindBtn.dataset.kind;
      state.visible = PAGE_SIZE;
      render();
      return;
    }

    const tagBtn = e.target.closest('[data-tag]');
    if (tagBtn) {
      const chosen = tagBtn.dataset.tag;
      state.tag = state.tag.toLowerCase() === chosen.toLowerCase() ? 'todos' : chosen;
      state.visible = PAGE_SIZE;
      render();
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

  els.sort?.addEventListener('change', () => {
    state.sort = els.sort.value;
    renderFeed();
  });

  els.loadMore?.addEventListener('click', () => {
    state.visible += PAGE_SIZE;
    renderFeed();
    window.UI.toast('Mostrando todas las publicaciones disponibles');
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
