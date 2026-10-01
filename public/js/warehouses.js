// public/js/warehouses.js
// Логика страницы управления складами

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let warehouses = [];
let deleteTarget = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏢 Страница складов: загрузка...');
    await loadWarehouses();
});

/**
 * Загрузить список складов
 */
async function loadWarehouses() {
    const container = document.getElementById('warehousesList');
    if (!container) return;

    try {
        const response = await fetch('/api/admin/warehouses');
        warehouses = await response.json();

        console.log(`✅ Загружено складов: ${warehouses.length}`);
        renderWarehouses();
        updateStats();
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        container.innerHTML = `
            <div class="catalog-empty">
                <span class="empty-icon">❌</span>
                <div class="empty-text">Ошибка загрузки</div>
                <div class="empty-hint">${escapeHtml(error.message)}</div>
            </div>
        `;
    }
}

// ============================================================
// ОТРИСОВКА
// ============================================================

function renderWarehouses() {
    const container = document.getElementById('warehousesList');
    if (!container) return;

    if (warehouses.length === 0) {
        container.innerHTML = `
            <div class="catalog-empty">
                <span class="empty-icon">📭</span>
                <div class="empty-text">Складов пока нет</div>
                <div class="empty-hint">Нажмите "➕ Добавить склад" чтобы создать первый</div>
            </div>
        `;
        return;
    }

    container.innerHTML = warehouses.map(wh => {
        const isDefault = wh.is_default === 1;
        const isInactive = wh.is_active === 0;

        const classes = [
            'warehouse-card',
            isDefault ? 'is-default' : '',
            isInactive ? 'is-inactive' : ''
        ].filter(Boolean).join(' ');

        const badges = [];
        if (isDefault) {
            badges.push('<span class="badge badge-default">⭐ По умолчанию</span>');
        }
        badges.push(isInactive 
            ? '<span class="badge badge-inactive">🚫 Неактивен</span>'
            : '<span class="badge badge-active">✅ Активен</span>'
        );

        const addressHtml = wh.address 
            ? `<div class="warehouse-address"><span class="icon">📍</span> ${escapeHtml(wh.address)}</div>`
            : '';

        const descriptionHtml = wh.description
            ? `<div class="warehouse-description">${escapeHtml(wh.description)}</div>`
            : '';

        const setDefaultBtn = isDefault
            ? ''
            : `<button onclick="setDefaultWarehouse(${wh.id})" class="btn btn-back btn-icon-only" title="Сделать по умолчанию">⭐</button>`;

        return `
            <div class="${classes}">
                <div class="warehouse-card-header">
                    <div class="warehouse-icon">🏢</div>
                    <div class="warehouse-info">
                        <div class="warehouse-name">
                            ${escapeHtml(wh.name)}
                            ${isDefault ? '<span class="default-star">⭐</span>' : ''}
                        </div>
                        ${addressHtml}
                        <div class="warehouse-badges">
                            ${badges.join('')}
                        </div>
                    </div>
                </div>

                ${descriptionHtml}

                <div class="warehouse-stats">
                    <div class="warehouse-stat">
                        <div class="warehouse-stat-value zones">${wh.zones_count || 0}</div>
                        <div class="warehouse-stat-label">📍 Зон</div>
                    </div>
                    <div class="warehouse-stat">
                        <div class="warehouse-stat-value racks">${wh.racks_count || 0}</div>
                        <div class="warehouse-stat-label">🗄️ Стеллажей</div>
                    </div>
                    <div class="warehouse-stat">
                        <div class="warehouse-stat-value cells">${wh.cells_count || 0}</div>
                        <div class="warehouse-stat-label">📦 Ячеек</div>
                    </div>
                    <div class="warehouse-stat">
                        <div class="warehouse-stat-value">${wh.equipment_count || 0}</div>
                        <div class="warehouse-stat-label">🔧 Техники</div>
                    </div>
                </div>

                <div class="warehouse-actions">
                    <a href="/admin/warehouses/${wh.id}" class="btn btn-success btn-sm">
                        📦 <span>Открыть</span>
                    </a>
                    <button onclick="openWarehouseModal(${wh.id})" class="btn btn-primary btn-sm btn-icon-only" title="Редактировать">
                        ✏️
                    </button>
                    ${setDefaultBtn}
                    <button onclick="deleteWarehouseItem(${wh.id}, '${escapeAttr(wh.name)}', ${wh.zones_count || 0}, ${wh.equipment_count || 0})" 
                            class="btn btn-danger btn-sm btn-icon-only" 
                            title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const statWarehouses = document.querySelector('.stat-card .number');
    // Статистика обновляется через сервер, ничего не делаем
    // Если нужно — можно пересчитать на клиенте
}

// ============================================================
// МОДАЛЬНОЕ ОКНО: СОЗДАНИЕ/РЕДАКТИРОВАНИЕ
// ============================================================

function openWarehouseModal(id = null) {
    const modal = document.getElementById('warehouseModal');
    const title = document.getElementById('warehouseModalTitle');
    const form = document.getElementById('warehouseForm');
    const activeGroup = document.getElementById('activeGroup');

    form.reset();

    if (id) {
        // Редактирование
        const wh = warehouses.find(w => w.id === id);
        if (!wh) return;

        title.textContent = '✏️ Редактировать склад';
        document.getElementById('warehouseId').value = wh.id;
        document.getElementById('warehouseName').value = wh.name || '';
        document.getElementById('warehouseAddress').value = wh.address || '';
        document.getElementById('warehouseDescription').value = wh.description || '';
        document.getElementById('warehouseIsDefault').checked = wh.is_default === 1;
        document.getElementById('warehouseIsActive').checked = wh.is_active === 1;

        activeGroup.style.display = 'block';
    } else {
        // Создание
        title.textContent = '➕ Добавить склад';
        document.getElementById('warehouseId').value = '';
        document.getElementById('warehouseName').value = '';
        document.getElementById('warehouseAddress').value = '';
        document.getElementById('warehouseDescription').value = '';
        document.getElementById('warehouseIsDefault').checked = warehouses.length === 0;
        document.getElementById('warehouseIsActive').checked = true;

        activeGroup.style.display = 'none';
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('warehouseName').focus(), 100);
}

function closeWarehouseModal() {
    document.getElementById('warehouseModal').classList.remove('active');
}

async function saveWarehouse(event) {
    event.preventDefault();

    const btn = document.getElementById('warehouseSaveBtn');
    const id = document.getElementById('warehouseId').value;
    const isEdit = !!id;

    const data = {
        name: document.getElementById('warehouseName').value.trim(),
        address: document.getElementById('warehouseAddress').value.trim(),
        description: document.getElementById('warehouseDescription').value.trim(),
        is_default: document.getElementById('warehouseIsDefault').checked,
        is_active: document.getElementById('warehouseIsActive').checked,
    };

    if (!data.name) {
        showToast('❌ Введите название склада', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';

    try {
        const url = isEdit 
            ? `/api/admin/warehouses/${id}` 
            : '/api/admin/warehouses';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
            showToast(`✅ Склад ${isEdit ? 'обновлён' : 'создан'}`, 'success');
            closeWarehouseModal();
            await loadWarehouses();
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

async function setDefaultWarehouse(id) {
    const wh = warehouses.find(w => w.id === id);
    if (!wh) return;

    if (!confirm(`Назначить склад "${wh.name}" по умолчанию?\n\nПри возврате техники она будет направляться сюда.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/warehouses/${id}/set-default`, {
            method: 'POST',
        });

        const result = await response.json();

        if (result.success) {
            showToast('⭐ ' + result.message, 'success');
            await loadWarehouses();
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

function deleteWarehouseItem(id, name, zonesCount, equipmentCount) {
    deleteTarget = { id, name };

    const msg = document.getElementById('deleteMessage');
    msg.innerHTML = `Вы уверены, что хотите удалить склад <strong>"${escapeHtml(name)}"</strong>?`;

    const warning = document.getElementById('deleteWarning');
    const warningText = document.getElementById('deleteWarningText');

    const warnings = [];
    if (zonesCount > 0) {
        warnings.push(`В складе ${zonesCount} зон. Удаление невозможно, пока в нём есть зоны.`);
    }
    if (equipmentCount > 0) {
        warnings.push(`На складе ${equipmentCount} единиц техники.`);
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
        const response = await fetch(`/api/admin/warehouses/${deleteTarget.id}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
            showToast('✅ Склад удалён', 'success');
            closeDeleteModal();
            await loadWarehouses();
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
        if (e.target.id === 'warehouseModal') closeWarehouseModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeWarehouseModal();
        closeDeleteModal();
    }
});