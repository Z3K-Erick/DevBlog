/**
 * DevBlog - Admin Dashboard Logic (admin.html)
 * Control de la tabla de publicaciones, filtrado, conteo de estadísticas
 * y modal de confirmación de eliminación.
 */

let postToDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  renderStats();
  renderAdminTable();

  // Búsqueda en la tabla
  const searchInput = document.getElementById('admin-table-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderAdminTable();
    });
  }

  // Filtro de estado
  const statusFilter = document.getElementById('admin-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      renderAdminTable();
    });
  }

  // Confirmar eliminación en el modal
  const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      if (postToDeleteId) {
        BlogStore.deletePost(postToDeleteId);
        closeModal('delete-confirm-modal');
        postToDeleteId = null;
        showToast('Publicación eliminada correctamente', 'success');
        renderStats();
        renderAdminTable();
      }
    });
  }
}

// Estadísticas de publicaciones
function renderStats() {
  const posts = BlogStore.getPosts();
  const total = posts.length;
  const published = posts.filter(p => p.status === 'publicado').length;
  const drafts = posts.filter(p => p.status === 'borrador').length;

  const totalEl = document.getElementById('stat-total-posts');
  if (totalEl) totalEl.innerText = total;

  const pubEl = document.getElementById('stat-published-posts');
  if (pubEl) pubEl.innerText = published;

  const draftEl = document.getElementById('stat-draft-posts');
  if (draftEl) draftEl.innerText = drafts;
}

// Renderizado de filas en la tabla
function renderAdminTable() {
  const tableBody = document.getElementById('admin-table-body');
  if (!tableBody) return;

  const searchInput = document.getElementById('admin-table-search');
  const statusFilter = document.getElementById('admin-status-filter');

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedStatus = statusFilter ? statusFilter.value : 'todos';

  let posts = BlogStore.getPosts();

  // Filtrar por término
  if (searchTerm) {
    posts = posts.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      (p.category && p.category.toLowerCase().includes(searchTerm))
    );
  }

  // Filtrar por estado
  if (selectedStatus !== 'todos') {
    posts = posts.filter(p => p.status === selectedStatus);
  }

  if (posts.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          No se encontraron publicaciones con los filtros seleccionados.
        </td>
      </tr>
    `;
    updatePaginationCount(0);
    return;
  }

  tableBody.innerHTML = posts.map(post => {
    const isPublished = post.status === 'publicado';
    const statusClass = isPublished ? 'status-published' : 'status-draft';
    const statusLabel = isPublished ? 'Publicado' : 'Borrador';

    return `
      <tr>
        <td>
          <a href="post.html?id=${post.id}" class="table-post-title">${post.title}</a>
          <span class="table-post-excerpt">${post.excerpt || 'Sin extracto'}</span>
        </td>
        <td>
          <span class="badge badge-react">${post.category || 'General'}</span>
        </td>
        <td>
          <span>${post.formattedDate || post.date}</span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </td>
        <td>
          <div class="table-actions">
            <a href="post.html?id=${post.id}" class="btn btn-secondary btn-sm" title="Ver en blog" target="_blank">
              👁️
            </a>
            <a href="editor.html?id=${post.id}" class="btn btn-secondary btn-sm" title="Editar publicación">
              ✏️
            </a>
            <button class="btn btn-ghost btn-sm" style="color: var(--accent-rose);" title="Eliminar" onclick="promptDelete('${post.id}', '${escapeQuotes(post.title)}')">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePaginationCount(posts.length);
}

function updatePaginationCount(count) {
  const el = document.getElementById('table-pagination-count');
  if (el) {
    el.innerText = `Mostrando ${count} publicaciones`;
  }
}

// Disparador del modal de eliminación
function promptDelete(postId, postTitle) {
  postToDeleteId = postId;
  const nameEl = document.getElementById('delete-modal-post-title');
  if (nameEl) {
    nameEl.innerText = `"${postTitle}"`;
  }
  openModal('delete-confirm-modal');
}

function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.promptDelete = promptDelete;
