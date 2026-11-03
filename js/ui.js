/**
 * DevBlog — Componentes de interfaz compartidos
 * ---------------------------------------------------------------
 * - Header con botón invisible junto a la foto de perfil + avatar
 *   para abrir el modal de Iniciar Sesión.
 * - Modal "Iniciar Sesión" y Modal "¿Eliminar publicación?" idénticos
 *   al maquetado de Figma.
 * - Componente reutilizable PostCard (vista pública y Mi Feed).
 */
(function () {
  'use strict';

  const { Auth, Utils } = window.DevBlog;
  const esc = Utils.escapeHtml;

  const svg = (paths, size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const Icons = {
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 14),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>', 14),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>', 18),
    alert: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>', 18),
    image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', 16),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 13),
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
   * Modales base
   * ------------------------------------------------------------- */
  let lastFocused = null;

  function createModal(id, html, onDismiss) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.hidden = true;
    overlay.innerHTML = html;
    overlay._onDismiss = onDismiss;

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) dismissModal(overlay);
    });
    overlay.querySelectorAll('[data-dismiss]').forEach((btn) =>
      btn.addEventListener('click', () => dismissModal(overlay))
    );
    document.body.appendChild(overlay);
    return overlay;
  }

  function openModal(overlay) {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    document.body.classList.add('has-modal');
    const focusTarget = overlay.querySelector('[data-autofocus]') || overlay.querySelector('input, button');
    focusTarget?.focus();
  }

  function closeModal(overlay) {
    overlay.classList.remove('is-open');
    document.body.classList.remove('has-modal');
    setTimeout(() => (overlay.hidden = true), 180);
    lastFocused?.focus?.();
  }

  function dismissModal(overlay) {
    closeModal(overlay);
    overlay._onDismiss?.();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal-overlay.is-open');
    if (open) dismissModal(open);
  });

  /* ---------------------------------------------------------------
   * Modal 2 (Figma): Iniciar Sesión
   * ------------------------------------------------------------- */
  let loginModal = null;

  function getLoginModal() {
    if (loginModal) return loginModal;

    loginModal = createModal(
      'login-modal',
      `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div class="modal-header">
          <div>
            <h2 class="modal-title" id="login-title">Iniciar Sesión</h2>
            <p class="modal-subtitle">Acceso privado al panel de administración</p>
          </div>
          <button type="button" class="icon-btn" data-dismiss aria-label="Cerrar">${Icons.close}</button>
        </div>
        <form class="modal-body" id="login-form" autocomplete="off" novalidate>
          <div class="field">
            <label class="label" for="login-user">Usuario / Correo</label>
            <input class="input" id="login-user" name="user" placeholder="Ingresa tu usuario o correo" data-autofocus required>
          </div>
          <div class="field">
            <label class="label" for="login-pass">Contraseña</label>
            <input class="input" id="login-pass" name="password" type="password" placeholder="••••••••••••" required>
          </div>
          <p class="form-error" id="login-error" role="alert" hidden>Usuario o contraseña incorrectos.</p>
          <button type="submit" class="btn btn-primary btn-block">Ingresar al Dashboard</button>
        </form>
      </div>`
    );

    const form = loginModal.querySelector('#login-form');
    const error = loginModal.querySelector('#login-error');
    const card = loginModal.querySelector('.modal');

    form.addEventListener('input', () => (error.hidden = true));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (Auth.login(form.user.value, form.password.value)) {
        window.location.href = 'dashboard.html';
        return;
      }
      error.hidden = false;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    });

    return loginModal;
  }

  function openLogin() {
    if (Auth.isAdmin()) {
      window.location.href = 'dashboard.html';
      return;
    }
    const modal = getLoginModal();
    modal.querySelector('#login-form').reset();
    modal.querySelector('#login-error').hidden = true;
    openModal(modal);
  }

  /* ---------------------------------------------------------------
   * Modal 1 (Figma): ¿Eliminar publicación?
   * ------------------------------------------------------------- */
  let deleteModal = null;
  let resolveDelete = null;

  function settleDelete(value) {
    resolveDelete?.(value);
    resolveDelete = null;
  }

  function getDeleteModal() {
    if (deleteModal) return deleteModal;

    deleteModal = createModal(
      'delete-modal',
      `<div class="modal modal--sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc">
        <div class="modal-body">
          <div class="alert-head">
            <span class="alert-badge">${Icons.alert}</span>
            <h2 class="modal-title" id="delete-title">¿Eliminar publicación?</h2>
          </div>
          <p class="modal-text" id="delete-desc">
            Esta acción eliminará <strong data-post-title></strong> de forma permanente y no se podrá recuperar del feed ni del gestor.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-dismiss data-autofocus>Cancelar</button>
          <button type="button" class="btn btn-danger btn-sm" data-confirm>Sí, eliminar</button>
        </div>
      </div>`,
      () => settleDelete(false)
    );

    deleteModal.querySelector('[data-confirm]').addEventListener('click', () => {
      closeModal(deleteModal);
      settleDelete(true);
    });

    return deleteModal;
  }

  function confirmDelete(title) {
    settleDelete(false);
    const modal = getDeleteModal();
    modal.querySelector('[data-post-title]').textContent = `“${title}”`;
    openModal(modal);
    return new Promise((resolve) => (resolveDelete = resolve));
  }

  /* ---------------------------------------------------------------
   * Colores de tags y estados
   * ------------------------------------------------------------- */
  function tagClass(tag) {
    const key = Utils.normalizeText(tag);
    if (key.includes('react') || key.includes('fast')) return 'tag--c1';
    if (key.includes('ui') || key.includes('ux') || key.includes('css')) return 'tag--c2';
    if (key.includes('figma') || key.includes('python') || key.includes('back')) return 'tag--c3';
    if (key.includes('js') || key.includes('java')) return 'tag--c4';
    return 'tag--c0';
  }

  function statusBadge(status) {
    return status === 'publicado'
      ? '<span class="status status--published">Publicado</span>'
      : '<span class="status status--draft">Borrador</span>';
  }

  /* ---------------------------------------------------------------
   * PostCard reutilizable (Público y Mi Feed)
   * ------------------------------------------------------------- */
  function postCard(post, { variant = 'row', admin = false } = {}) {
    const url = `post.html?id=${encodeURIComponent(post.id)}`;
    // Si post.layout está definido ('side' o 'top'), se respeta fielmente.
    // Si no está definido, se adapta de forma inteligente según la relación de aspecto.
    const explicitLayout = post.layout === 'top' ? 'featured' : (post.layout === 'side' ? 'row' : null);
    const autoVariant = explicitLayout || (variant === 'featured' ? 'featured' : 'row');
    const onloadAttr = explicitLayout
      ? ''
      : `onload="if(!this.closest('.post-card--editing')&&this.naturalWidth&&this.naturalHeight){const feat=this.naturalWidth/this.naturalHeight>=1.9;this.closest('.post-card').classList.toggle('post-card--featured',feat);this.closest('.post-card').classList.toggle('post-card--row',!feat);}"`;
    const media = post.image
      ? `<a class="post-card-media" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(post.image)}" alt="" loading="lazy" ${onloadAttr}></a>`
      : '';

    const kindLabel = (post.kind || 'Proyecto').toUpperCase();
    const dateLabel = Utils.formatDate(post.date).toUpperCase();

    if (autoVariant === 'featured' && !admin) {
      return `
        <article class="post-card post-card--featured" data-id="${esc(post.id)}">
          ${media}
          <div class="post-card-body">
            <div class="post-card-top">
              <span class="featured-kicker">${esc(kindLabel)} DESTACADO · ${esc(dateLabel)}</span>
              <span class="post-readtime">${Icons.clock} ${esc(post.readTime)}</span>
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

    const actions = admin
      ? `<div class="post-card-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(post.id)}">${Icons.edit}<span>Editar</span></button>
          <button type="button" class="btn btn-secondary btn-sm btn-danger-soft" data-action="delete" data-id="${esc(post.id)}">${Icons.trash}<span>Eliminar</span></button>
        </div>`
      : '';

    const metaLine = admin
      ? `<div class="post-card-top">
          ${statusBadge(post.status)}
          ${actions}
        </div>
        <p class="post-kicker">${esc(kindLabel)} · ${esc(dateLabel)} · ${esc(post.readTime.toUpperCase())}</p>`
      : `<p class="post-kicker">${esc(kindLabel)} · ${esc(dateLabel)} · ${esc(post.readTime.toUpperCase())}</p>`;

    const footerLeft = admin
      ? `<span class="muted">${post.status === 'publicado' ? 'Visible en el feed público' : 'Guardado como borrador'}</span>`
      : `<div class="chip-list">${post.tags.map((t) => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}</div>`;

    return `
      <article class="post-card post-card--row${post.image ? '' : ' post-card--no-media'}" data-id="${esc(post.id)}">
        ${media}
        <div class="post-card-body">
          ${metaLine}
          <h3 class="post-card-title"><a href="${url}">${esc(post.title)}</a></h3>
          ${post.excerpt ? `<p class="post-card-excerpt">${esc(post.excerpt)}</p>` : ''}
          ${admin ? `<div class="chip-list">${post.tags.map((t) => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="post-card-footer">
            ${footerLeft}
            <a class="link-arrow" href="${url}">Leer post <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </article>`;
  }

  /* ---------------------------------------------------------------
   * TagInput
   * ------------------------------------------------------------- */
  function TagInput(root, initial = []) {
    let tags = [...initial];
    root.classList.add('tag-input');
    root.innerHTML =
      '<div class="tag-input-list"></div>' +
      '<input type="text" class="tag-input-field" placeholder="+ Agregar tag y presiona Enter" aria-label="Agregar etiqueta">';

    const list = root.querySelector('.tag-input-list');
    const field = root.querySelector('.tag-input-field');

    const render = () => {
      list.innerHTML = tags
        .map(
          (t, i) =>
            `<span class="chip chip--removable">${esc(t)}<button type="button" data-index="${i}" aria-label="Quitar ${esc(t)}">×</button></span>`
        )
        .join('');
    };

    const add = (value) => {
      const tag = value.trim().replace(/^#/, '').replace(/,/g, '');
      if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        tags.push(tag);
        render();
      }
    };

    const commit = () => {
      if (field.value.trim()) add(field.value);
      field.value = '';
    };

    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Backspace' && !field.value && tags.length) {
        tags.pop();
        render();
      }
    });
    field.addEventListener('blur', commit);
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-index]');
      if (!btn) return;
      tags.splice(Number(btn.dataset.index), 1);
      render();
      field.focus();
    });
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target === list) field.focus();
    });

    render();

    return {
      get: () => (commit(), [...tags]),
      set: (next) => ((tags = [...next]), render()),
      clear: () => ((tags = ['React', 'UI/UX', 'Proyecto']), (field.value = ''), render()),
    };
  }

  /* ---------------------------------------------------------------
   * Lectura de imagen a DataURL
   * ------------------------------------------------------------- */
  function readImage(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Selecciona un archivo de imagen válido.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => {
        if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
          resolve(reader.result);
          return;
        }
        const img = new Image();
        img.onerror = () => reject(new Error('Imagen no válida.'));
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------------
   * Sincronización de foto de perfil y Header
   * ------------------------------------------------------------- */
  function syncAvatars() {
    const src = window.DevBlog.Store.getAvatar();
    document
      .querySelectorAll('.avatar-btn img, .profile-avatar-circle img, .post-author-avatar, .dash-user img, [data-user-avatar]')
      .forEach((img) => {
        img.src = src;
      });
  }

  function initHeader() {
    syncAvatars();

    // Botón invisible al lado de la foto de perfil: único acceso al login
    const secretBtn = document.getElementById('secret-login-btn');
    if (secretBtn) {
      secretBtn.addEventListener('click', () => {
        openLogin();
      });
    }

    const avatar = document.getElementById('avatar-btn');
    if (avatar) {
      avatar.classList.toggle('is-admin', Auth.isAdmin());
      avatar.addEventListener('click', () => {
        if (Auth.isAdmin()) window.location.href = 'dashboard.html';
      });
    }

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
    openLogin,
    confirmDelete,
    postCard,
    statusBadge,
    tagClass,
    TagInput,
    readImage,
    syncAvatars,
  };
})();
