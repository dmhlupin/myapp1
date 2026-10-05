// public/js/workplaces.js
// Логика страницы управления офисами (рабочие места)

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let offices = [];
let deleteTarget = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    await loadOffices();
});

/**
 * Загрузить список офисов
 */
async function loadOffices() {
    const container = document.getElementById('officesList');
    if (!container) return;

    try {
        const response = await fetch('/api/admin/offices');
        offices = await response.json();

        renderOffices();
        updateStats();
    } catch (error) {
        console.error('❌ Ошибка загрузки офисов:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span class="emoji">❌</span>
                <h3>Ошибка загрузки</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// ============================================================
// ОТРИСОВКА
// ============================================================

function renderOffices() {
    const container = document.getElementById('officesList');
    if (!container) return;

    if (offices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="emoji">📭</span>
                <h3>Офисов пока нет</h3>
                <p>Нажмите "➕ Добавить офис" чтобы создать первый</p>
            </div>
        `;
        return;
    }

    container.innerHTML = offices.map(office => {
        const isDefault = office.is_default === 1;
        const isInactive = office.is_active === 0;

        const classes = [
            'office-card',
            isDefault ? 'is-default' : '',
            isInactive ? 'is-inactive' : ''
        ].filter(Boolean).join(' ');

        const badges = [];
        if (isDefault) {
            badges.push('<span class="badge badge-warning">⭐ По умолчанию</span>');
        }
        badges.push(isInactive
            ? '<span class="badge badge-danger">🚫 Неактивен</span>'
            : '<span class="badge badge-success">✅ Активен</span>'
        );

        const addressHtml = office.address
            ? `<div class="office-address"><span class="icon">📍</span> ${escapeHtml(office.address)}</div>`
            : '';

        const descriptionHtml = office.description
            ? `<div class="office-description">${escapeHtml(office.description)}</div>`
            : '';

        const setDefaultBtn = isDefault
            ? ''
            : `<button onclick="setDefaultOffice(${office.id})" class="btn btn-ghost btn-sm btn-icon-only" title="Сделать по умолчанию">⭐</button>`;

        return `
            <div class="${classes}">
                <div class="office-card-header">
                    <div class="office-icon">🏛️</div>
                    <div class="office-info">
                        <div class="office-name">
                            ${escapeHtml(office.name)}
                            ${isDefault ? '<span class="default-star">⭐</span>' : ''}
                        </div>
                        ${addressHtml}
                        <div class="office-badges">
                            ${badges.join('')}
                        </div>
                    </div>
                </div>

                ${descriptionHtml}

                <div class="office-stats">
                    <div class="office-stat">
                        <div class="office-stat-value rooms">${office.rooms_count || 0}</div>
                        <div class="office-stat-label">🚪 Кабинетов</div>
                    </div>
                    <div class="office-stat">
                        <div class="office-stat-value workplaces">${office.workplaces_count || 0}</div>
                        <div class="office-stat-label">🪑 Мест</div>
                    </div>
                    <div class="office-stat">
                        <div class="office-stat-value equipment">${office.equipment_count || 0}</div>
                        <div class="office-stat-label">🔧 Техники</div>
                    </div>
                </div>

                <div class="office-actions">
                    <a href="/admin/workplaces/${office.id}" class="btn btn-success btn-sm">
                        🏛️ <span>Открыть</span>
                    </a>
                    <button onclick="openOfficeModal(${office.id})" class="btn btn-primary btn-sm btn-icon-only" title="Редактировать">
                        ✏️
                    </button>
                    ${setDefaultBtn}
                    <button onclick="deleteOfficeItem(${office.id}, '${escapeAttr(office.name)}', ${office.rooms_count || 0}, ${office.equipment_count || 0})"
                            class="btn btn-danger btn-sm btn-icon-only"
                            title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    // Статистика обновляется через сервер (плейсхолдеры {{...}}),
    // клиентский пересчёт не требуется.
}

// ============================================================
// МОДАЛЬНОЕ ОКНО: СОЗДАНИЕ/РЕДАКТИРОВАНИЕ
// ============================================================

function openOfficeModal(id = null) {
    const modal = document.getElementById('officeModal');
    const title = document.getElementById('officeModalTitle');
    const form = document.getElementById('officeForm');
    const activeGroup = document.getElementById('activeGroup');

    form.reset();

    if (id) {
        // Редактирование
        const office = offices.find(o => o.id === id);
        if (!office) return;

        title.textContent = '✏️ Редактировать офис';
        document.getElementById('officeId').value = office.id;
        document.getElementById('officeName').value = office.name || '';
        document.getElementById('officeAddress').value = office.address || '';
        document.getElementById('officeDescription').value = office.description || '';
        document.getElementById('officeIsDefault').checked = office.is_default === 1;
        document.getElementById('officeIsActive').checked = office.is_active === 1;

        activeGroup.style.display = 'block';
    } else {
        // Создание
        title.textContent = '➕ Добавить офис';
        document.getElementById('officeId').value = '';
        document.getElementById('officeName').value = '';
        document.getElementById('officeAddress').value = '';
        document.getElementById('officeDescription').value = '';
        document.getElementById('officeIsDefault').checked = offices.length === 0;
        document.getElementById('officeIsActive').checked = true;

        activeGroup.style.display = 'none';
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('officeName').focus(), 100);
}

function closeOfficeModal() {
    document.getElementById('officeModal').classList.remove('active');
}

async function saveOffice(event) {
    event.preventDefault();

    const btn = document.getElementById('officeSaveBtn');
    const id = document.getElementById('officeId').value;
    const isEdit = !!id;

    const data = {
        name: document.getElementById('officeName').value.trim(),
        address: document.getElementById('officeAddress').value.trim(),
        description: document.getElementById('officeDescription').value.trim(),
        is_default: document.getElementById('officeIsDefault').checked,
        is_active: document.getElementById('officeIsActive').checked,
    };

    if (!data.name) {
        showToast('❌ Введите название офиса', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';

    try {
        const url = isEdit
            ? `/api/admin/offices/${id}`
            : '/api/admin/offices';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
            showToast(`✅ Офис ${isEdit ? 'обновлён' : 'создан'}`, 'success');
            closeOfficeModal();
            await loadOffices();
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Сохранить';
    }
}

// ============================================================
// УСТАНОВКА ПО УМОЛЧАНИЮ
// ============================================================

async function setDefaultOffice(id) {
    const office = offices.find(o => o.id === id);
    if (!office) return;

    if (!confirm(`Назначить офис "${office.name}" по умолчанию?\n\nНовые кабинеты и рабочие места будут создаваться в нём.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/offices/${id}/set-default`, {
            method: 'POST',
        });

        const result = await response.json();

        if (result.success) {
            showToast('⭐ ' + result.message, 'success');
            await loadOffices();
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
    }
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================

function deleteOfficeItem(id, name, roomsCount, equipmentCount) {
    deleteTarget = { id, name };

    const msg = document.getElementById('deleteMessage');
    msg.innerHTML = `Вы уверены, что хотите удалить офис <strong>"${escapeHtml(name)}"</strong>?`;

    const warning = document.getElementById('deleteWarning');
    const warningText = document.getElementById('deleteWarningText');

    const warnings = [];
    if (roomsCount > 0) {
        warnings.push(`В офисе ${roomsCount} кабинет(ов). Удаление невозможно, пока в нём есть кабинеты.`);
    }
    if (equipmentCount > 0) {
        warnings.push(`В офисе ${equipmentCount} единиц техники на рабочих местах.`);
    }

    if (warnings.length > 0) {
        warningText.innerHTML = warnings.join('<br>');
        warning.style.display = 'flex';
    } else {
        warning.style.display = 'none';
    }

    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTarget = null;
}

async function confirmDelete() {
    if (!deleteTarget) return;

    try {
        const response = await fetch(`/api/admin/offices/${deleteTarget.id}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
            showToast('✅ Офис удалён', 'success');
            closeDeleteModal();
            await loadOffices();
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
    }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛОК
// ============================================================

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'officeModal') closeOfficeModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeOfficeModal();
        closeDeleteModal();
    }
});