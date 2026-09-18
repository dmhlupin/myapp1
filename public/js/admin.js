// public/js/admin.js — Логика админ-панели

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Получить инициалы из имени
 * "Мария Петрова" → "МП"
 * "admin" → "A"
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(p => p);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Форматирование даты и времени в относительный вид
 * "5 мин назад", "2 ч назад", "вчера"
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        if (diffDays < 7) return `${diffDays} дн назад`;
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

// ===== ОСНОВНАЯ ЛОГИКА =====


let deleteId = null;
let deleteType = null;
let deleteUserName = '';
let deleteEquipmentCount = 0;
let currentTempPassword = '';

// ===== ВКЛАДКИ =====

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    event.target.classList.add('active');
}

// ===== ПОИСК =====

function searchTable(type) {
    const input = document.getElementById(type === 'equipment' ? 'searchEquipment' : 'searchUsers');
    const filter = input.value.toLowerCase();
    const table = document.getElementById(type === 'equipment' ? 'equipmentTableBody' : 'usersTableBody');
    if (!table) return;
    
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        let found = false;
        for (let j = 0; j < cells.length; j++) {
            const text = cells[j].textContent || cells[j].innerText;
            if (text.toLowerCase().indexOf(filter) > -1) {
                found = true;
                break;
            }
        }
        rows[i].style.display = found ? '' : 'none';
    }
}

// ===== ТЕХНИКА =====

function editEquipment(id) {
    window.location.href = `/admin/edit/${id}`;
}

function deleteEquipment(id) {
    deleteId = id;
    deleteType = 'equipment';
    deleteEquipmentCount = 0;
    
    document.getElementById('deleteUserText').textContent = 
        'Вы уверены, что хотите удалить эту технику? Это действие нельзя отменить.';
    document.getElementById('deleteUserWarning').style.display = 'none';
    document.getElementById('deleteModal').classList.add('active');
}

// ===== ПОЛЬЗОВАТЕЛИ =====

function editUser(id) {
    window.location.href = `/admin/user/edit/${id}`;
}

function deleteUser(id, name) {
    deleteId = id;
    deleteType = 'user';
    deleteUserName = name || 'пользователя';
    
    // Находим строку и получаем количество техники
    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells[0] && parseInt(cells[0].textContent) === id) {
            const badge = cells[5]?.querySelector('.badge');
            deleteEquipmentCount = badge ? parseInt(badge.textContent) : 0;
        }
    });
    
    document.getElementById('deleteUserText').innerHTML = 
        `Вы уверены, что хотите удалить пользователя <strong>"${deleteUserName}"</strong>?`;
    
    const warning = document.getElementById('deleteUserWarning');
    if (deleteEquipmentCount > 0) {
        document.getElementById('deleteEquipmentCount').textContent = deleteEquipmentCount;
        warning.style.display = 'flex';
    } else {
        warning.style.display = 'none';
    }
    
    document.getElementById('deleteModal').classList.add('active');
}

function closeModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteId = null;
    deleteType = null;
    deleteUserName = '';
    deleteEquipmentCount = 0;
}

async function confirmDelete() {
    if (!deleteId) return;
    
    const endpoint = deleteType === 'equipment' 
        ? `/api/admin/equipment/${deleteId}`
        : `/api/admin/users/${deleteId}`;
    
    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ ' + result.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showToast('❌ Ошибка при удалении', 'error');
    }
    
    closeModal();
}

// ===== БЛОКИРОВКА =====

async function blockUser(id) {
    if (!confirm('Заблокировать пользователя? Он не сможет войти в систему.')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${id}/block`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ ' + result.message, 'success');
            setTimeout(() => location.reload(), 800);
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showToast('❌ Ошибка блокировки', 'error');
    }
}

async function unblockUser(id) {
    try {
        const response = await fetch(`/api/admin/users/${id}/unblock`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ ' + result.message, 'success');
            setTimeout(() => location.reload(), 800);
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showToast('❌ Ошибка разблокировки', 'error');
    }
}

// ===== СБРОС ПАРОЛЯ =====

async function resetUserPassword(id, username) {
    if (!confirm(`Сбросить пароль для пользователя "${username}"?\n\nБудет сгенерирован новый временный пароль.`)) return;
    
    try {
        const response = await fetch(`/api/admin/users/${id}/reset-password`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            currentTempPassword = result.tempPassword;
            document.getElementById('tempPasswordValue').textContent = result.tempPassword;
            document.getElementById('passwordUsername').textContent = username;
            document.getElementById('passwordModal').classList.add('active');
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showToast('❌ Ошибка сброса пароля', 'error');
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    currentTempPassword = '';
    document.getElementById('tempPasswordValue').textContent = '';
}

function copyPassword() {
    if (!currentTempPassword) return;
    
    navigator.clipboard.writeText(currentTempPassword).then(() => {
        showToast('📋 Пароль скопирован в буфер обмена', 'success');
    }).catch(() => {
        showToast('❌ Не удалось скопировать', 'error');
    });
}

// ===== ПРОСМОТР ПОЛЬЗОВАТЕЛЯ =====

async function viewUser(id) {
  try {
    const response = await fetch(`/api/admin/users/${id}/details`);
    const data = await response.json();
    
    if (!data.user) {
      showToast('❌ Пользователь не найден', 'error');
      return;
    }
    
    const { user, stats, activeEquipment, history } = data;
    
    // Форматирование дат
    const lastLogin = user.last_login 
      ? new Date(user.last_login).toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : 'никогда';
    
    const createdAt = user.created_at 
      ? new Date(user.created_at).toLocaleDateString('ru-RU') 
      : '—';
    
    // Статус
    const isActive = user.is_active === 1;
    const statusBadge = isActive
      ? '<span class="status-badge status-available">✅ Активен</span>'
      : '<span class="status-badge status-retired">🚫 Заблокирован</span>';
    
    // Роль
    const isAdmin = user.role === 'admin';
    const roleBadge = isAdmin
      ? '<span class="role-badge role-admin">👑 Администратор</span>'
      : '<span class="role-badge role-user">👤 Пользователь</span>';
    
    // Инициалы
    const initials = getInitials(user.full_name || user.username);
    
    // Активная техника
    let activeEquipmentHtml = '';
    if (activeEquipment.length === 0) {
      activeEquipmentHtml = `
        <div class="empty-equipment">
          <span class="empty-icon">📭</span>
          <p>Нет активной техники</p>
        </div>
      `;
    } else {
      activeEquipmentHtml = '<div class="equipment-cards">';
      activeEquipment.forEach(eq => {
        const assignedDate = new Date(eq.assigned_date).toLocaleDateString('ru-RU');
        activeEquipmentHtml += `
          <div class="equipment-card">
            <div class="equipment-card-header">
              <span class="equipment-card-inv">${eq.inventory_number}</span>
              <span class="equipment-card-date">${assignedDate}</span>
            </div>
            <div class="equipment-card-body">
              <div class="equipment-card-name">${eq.name}</div>
              ${eq.model ? `<div class="equipment-card-model">${eq.model}</div>` : ''}
              ${eq.manufacturer ? `<div class="equipment-card-manufacturer">${eq.manufacturer}</div>` : ''}
            </div>
            ${eq.condition_on_assign ? `
              <div class="equipment-card-footer">
                Состояние: ${eq.condition_on_assign}
              </div>
            ` : ''}
          </div>
        `;
      });
      activeEquipmentHtml += '</div>';
    }
    
    // История (компактная таблица)
    let historyHtml = '';
    if (history.length === 0) {
      historyHtml = '<p style="color: #a0aec0; text-align: center; padding: 15px;">История пуста</p>';
    } else {
      historyHtml = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Инв. номер</th>
              <th>Название</th>
              <th>Выдано</th>
              <th>Возвращено</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
      `;
      history.forEach(h => {
        const assignedDate = h.assigned_date 
          ? new Date(h.assigned_date).toLocaleDateString('ru-RU') 
          : '—';
        const returnedDate = h.returned_date 
          ? new Date(h.returned_date).toLocaleDateString('ru-RU') 
          : '—';
        const statusBadge = h.status === 'active'
          ? '<span class="status-badge status-assigned">Активна</span>'
          : '<span class="status-badge status-available">Возвращена</span>';
        
        historyHtml += `
          <tr>
            <td><strong>${h.inventory_number}</strong></td>
            <td>${h.name}</td>
            <td>${assignedDate}</td>
            <td>${returnedDate}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
      historyHtml += '</tbody></table>';
    }
    
    // Собираем всё
    const body = document.getElementById('viewUserBody');
    body.innerHTML = `
      <!-- Заголовок с аватаром -->
      <div class="user-header-card">
        <div class="user-header-avatar">${initials}</div>
        <div class="user-header-info">
          <h2>${user.full_name || user.username}</h2>
          <div class="user-header-username">@${user.username}</div>
          <div class="user-header-badges">
            ${roleBadge}
            ${statusBadge}
          </div>
        </div>
      </div>
      
      <!-- Статистика -->
      <div class="user-stats">
        <div class="user-stat">
          <div class="user-stat-number active">${stats.active}</div>
          <div class="user-stat-label">Активной техники</div>
        </div>
        <div class="user-stat">
          <div class="user-stat-number total">${stats.total}</div>
          <div class="user-stat-label">Всего получал</div>
        </div>
        <div class="user-stat">
          <div class="user-stat-number returned">${stats.returned}</div>
          <div class="user-stat-label">Возвращено</div>
        </div>
      </div>
      
      <!-- Контакты -->
      <div class="user-detail-section">
        <h4>📋 Контактная информация</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Email</label>
            <div class="value">${user.email || '—'}</div>
          </div>
          <div class="detail-item">
            <label>Телефон</label>
            <div class="value">${user.phone || '—'}</div>
          </div>
          <div class="detail-item">
            <label>Отдел</label>
            <div class="value">${user.department || '—'}</div>
          </div>
          <div class="detail-item">
            <label>Последний вход</label>
            <div class="value">${lastLogin}</div>
          </div>
          <div class="detail-item">
            <label>Дата создания</label>
            <div class="value">${createdAt}</div>
          </div>
          <div class="detail-item">
            <label>ID пользователя</label>
            <div class="value">#${user.id}</div>
          </div>
        </div>
      </div>
      
      <!-- Активная техника -->
      <div class="user-detail-section">
        <h4>📦 Активная техника (${stats.active})</h4>
        ${activeEquipmentHtml}
      </div>
      
      <!-- История -->
      <div class="user-detail-section">
        <h4>📜 История получений (${stats.total})</h4>
        ${historyHtml}
      </div>
    `;
    
    document.getElementById('viewUserModal').classList.add('active');
  } catch (error) {
    console.error('Ошибка:', error);
    showToast('❌ Ошибка загрузки данных', 'error');
  }
}

function closeViewUserModal() {
    document.getElementById('viewUserModal').classList.remove('active');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener('DOMContentLoaded', function() {
    // Закрытие модалок по клику на оверлей
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this.id === 'deleteModal') closeModal();
                if (this.id === 'passwordModal') closePasswordModal();
                if (this.id === 'viewUserModal') closeViewUserModal();
            }
        });
    });
    
    // Фокус на поиск
    const searchEq = document.getElementById('searchEquipment');
    if (searchEq) searchEq.focus();
    
    // Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closePasswordModal();
            closeViewUserModal();
        }
    });
});