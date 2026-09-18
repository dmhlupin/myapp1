// public/js/admin.js — Логика админ-панели

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
        
        const { user, activeEquipment, history } = data;
        
        // Форматирование
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('ru-RU') : 'никогда';
        const created = user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—';
        const status = user.is_active 
            ? '<span class="status-badge status-available">Активен</span>' 
            : '<span class="status-badge status-retired">Заблокирован</span>';
        const role = user.role === 'admin' 
            ? '<span class="role-badge role-admin">👑 Админ</span>' 
            : '<span class="role-badge role-user">👤 Пользователь</span>';
        
        let equipmentHtml = '';
        if (activeEquipment.length === 0) {
            equipmentHtml = '<p style="color: #a0aec0; text-align: center; padding: 20px;">Нет активной техники</p>';
        } else {
            equipmentHtml = '<ul class="equipment-list-modal">';
            activeEquipment.forEach(eq => {
                equipmentHtml += `
                    <li>
                        <span class="inv">${eq.inventory_number}</span>
                        <span>${eq.name} ${eq.model ? '· ' + eq.model : ''}</span>
                    </li>
                `;
            });
            equipmentHtml += '</ul>';
        }
        
        const body = document.getElementById('viewUserBody');
        body.innerHTML = `
            <div class="user-detail-section">
                <h4>Основная информация</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Логин</label>
                        <div class="value">@${user.username}</div>
                    </div>
                    <div class="detail-item">
                        <label>ФИО</label>
                        <div class="value">${user.full_name || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Email</label>
                        <div class="value">${user.email}</div>
                    </div>
                    <div class="detail-item">
                        <label>Отдел</label>
                        <div class="value">${user.department || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Телефон</label>
                        <div class="value">${user.phone || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Роль</label>
                        <div class="value">${role}</div>
                    </div>
                    <div class="detail-item">
                        <label>Статус</label>
                        <div class="value">${status}</div>
                    </div>
                    <div class="detail-item">
                        <label>Последний вход</label>
                        <div class="value">${lastLogin}</div>
                    </div>
                    <div class="detail-item">
                        <label>Создан</label>
                        <div class="value">${created}</div>
                    </div>
                </div>
            </div>
            
            <div class="user-detail-section">
                <h4>📦 Активная техника (${activeEquipment.length})</h4>
                ${equipmentHtml}
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