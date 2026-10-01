// public/js/warehouse-details.js
// Логика страницы деталей склада: дерево Зоны → Стеллажи → Ячейки

// ============================================================
// СОСТОЯНИЕ
// ============================================================

// ID склада из data-атрибута
const pageData = document.getElementById('pageData');
const WAREHOUSE_ID = pageData ? parseInt(pageData.dataset.warehouseId) : null;
const WAREHOUSE_NAME = pageData ? pageData.dataset.warehouseName : '';

let tree = null;              // Дерево склада
let deleteTarget = null;      // { type: 'zone'|'rack'|'cell', id, name }

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏢 Страница склада: ID =', WAREHOUSE_ID);
    
    if (!WAREHOUSE_ID || isNaN(WAREHOUSE_ID)) {
        showToast('❌ Ошибка: не указан ID склада', 'error');
        setTimeout(() => window.location.href = '/admin/warehouses', 2000);
        return;
    }
    
    // Заполняем subtitle (адрес)
    updateSubtitle();
    
    // Загружаем дерево
    await loadWarehouseTree();
});

/**
 * Обновить subtitle (адрес)
 */
function updateSubtitle() {
    const subtitle = document.getElementById('warehouseSubtitle');
    if (!subtitle) return;
    // Subtitle уже заполнен через плейсхолдер, ничего не делаем
}

// ============================================================
// ЗАГРУЗКА ДЕРЕВА
// ============================================================

/**
 * Загрузить дерево склада через API
 */
async function loadWarehouseTree() {
    const container = document.getElementById('warehouseTree');
    if (!container) return;
    
    container.innerHTML = '<div class="catalog-loading">⏳ Загрузка структуры...</div>';
    
    try {
        const response = await fetch(`/api/admin/warehouses/${WAREHOUSE_ID}/tree`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки дерева');
        }
        
        tree = await response.json();
        console.log('✅ Дерево загружено:', tree);
        
        renderTree();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        container.innerHTML = `
            <div class="tree-empty">
                <span class="empty-icon">❌</span>
                <div class="empty-text">Ошибка загрузки</div>
                <div class="empty-hint">${escapeHtml(error.message)}</div>
            </div>
        `;
    }
}

// ============================================================
// ОТРИСОВКА ДЕРЕВА
// ============================================================

function renderTree() {
    const container = document.getElementById('warehouseTree');
    if (!container) return;
    
    if (!tree || !tree.zones || tree.zones.length === 0) {
        container.innerHTML = `
            <div class="tree-empty">
                <span class="empty-icon">📭</span>
                <div class="empty-text">Структура склада пуста</div>
                <div class="empty-hint">Нажмите "➕ Добавить зону" чтобы начать</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tree.zones.map(zone => renderZone(zone)).join('');
}

function renderZone(zone) {
    const racksCount = zone.racks ? zone.racks.length : 0;
    const equipmentCount = zone.equipment_count || 0;
    
    return `
        <div class="tree-zone" data-zone-id="${zone.id}">
            <div class="tree-zone-header" onclick="toggleZone(${zone.id}, event)">
                <span class="toggle">▶</span>
                <span class="icon">📍</span>
                <div class="tree-zone-info">
                    <div class="tree-zone-name">${escapeHtml(zone.name)}</div>
                    ${zone.description ? `<div class="tree-zone-description">${escapeHtml(zone.description)}</div>` : ''}
                </div>
                <div class="tree-zone-meta">
                    <span>🗄️ ${racksCount} стеллажей</span>
                    <span>🔧 ${equipmentCount} техники</span>
                </div>
                <div class="tree-zone-actions" onclick="event.stopPropagation()">
                    <button onclick="openRackModal(null, ${zone.id})" class="tree-btn add" title="Добавить стеллаж">➕</button>
                    <button onclick="openZoneModal(${zone.id})" class="tree-btn edit" title="Редактировать">✏️</button>
                    <button onclick="deleteZoneItem(${zone.id}, '${escapeAttr(zone.name)}', ${racksCount})" class="tree-btn delete" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="tree-zone-body">
                ${racksCount === 0 
                    ? `<div class="tree-empty" style="padding: 20px; background: white;">
                        <div class="empty-text" style="font-size: 13px;">Нет стеллажей</div>
                       </div>`
                    : zone.racks.map(rack => renderRack(rack, zone.id)).join('')
                }
            </div>
        </div>
    `;
}

function renderRack(rack, zoneId) {
    const cellsCount = rack.cells ? rack.cells.length : 0;
    const equipmentCount = rack.equipment_count || 0;
    
    return `
        <div class="tree-rack" data-rack-id="${rack.id}">
            <div class="tree-rack-header" onclick="toggleRack(${rack.id}, event)">
                <span class="toggle">▶</span>
                <span class="icon">🗄️</span>
                <div class="tree-rack-info">
                    <div class="tree-rack-name">${escapeHtml(rack.name)}</div>
                    ${rack.description ? `<div class="tree-rack-description">${escapeHtml(rack.description)}</div>` : ''}
                </div>
                <div class="tree-rack-meta">
                    <span>📦 ${cellsCount} ячеек</span>
                    <span>🔧 ${equipmentCount} техники</span>
                </div>
                <div class="tree-rack-actions" onclick="event.stopPropagation()">
                    <button onclick="openCellModal(null, ${rack.id})" class="tree-btn add" title="Добавить ячейку">➕</button>
                    <button onclick="openRackModal(${rack.id})" class="tree-btn edit" title="Редактировать">✏️</button>
                    <button onclick="deleteRackItem(${rack.id}, '${escapeAttr(rack.name)}', ${cellsCount})" class="tree-btn delete" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="tree-rack-body">
                ${cellsCount === 0
                    ? `<div class="tree-empty" style="padding: 15px; background: white;">
                        <div class="empty-text" style="font-size: 12px;">Нет ячеек</div>
                       </div>`
                    : rack.cells.map(cell => renderCell(cell)).join('')
                }
            </div>
        </div>
    `;
}

function renderCell(cell) {
    const equipmentCount = cell.equipment_count || 0;
    const capacity = cell.capacity || 0;
    
    // Определяем класс счётчика
    let countClass = 'empty';
    if (equipmentCount > 0) {
        countClass = capacity > 0 && equipmentCount >= capacity ? 'full' : 'has-items';
    }
    
    // Текст счётчика
    let countText = `${equipmentCount}`;
    if (capacity > 0) {
        countText += ` / ${capacity}`;
    }
    
    return `
        <div class="tree-cell" onclick="viewCell(${cell.id})">
            <span class="tree-cell-icon">📦</span>
            <div class="tree-cell-info">
                <div class="tree-cell-name">${escapeHtml(cell.name)}</div>
                ${cell.code ? `<div class="tree-cell-code">${escapeHtml(cell.code)}</div>` : ''}
            </div>
            <div class="tree-cell-meta">
                <span class="tree-cell-count ${countClass}">${countText}</span>
            </div>
            <div class="tree-cell-actions" onclick="event.stopPropagation()">
                <button onclick="openCellModal(${cell.id})" class="tree-btn edit" title="Редактировать">✏️</button>
                <button onclick="deleteCellItem(${cell.id}, '${escapeAttr(cell.name)}', ${equipmentCount})" class="tree-btn delete" title="Удалить">🗑️</button>
            </div>
        </div>
    `;
}

// ============================================================
// РАЗВОРАЧИВАНИЕ / СВОРАЧИВАНИЕ
// ============================================================

function toggleZone(zoneId, event) {
    if (event) event.stopPropagation();
    const zone = document.querySelector(`.tree-zone[data-zone-id="${zoneId}"]`);
    if (!zone) return;
    
    zone.classList.toggle('expanded');
    
    const toggle = zone.querySelector('.tree-zone-header .toggle');
    if (toggle) {
        toggle.textContent = zone.classList.contains('expanded') ? '▼' : '▶';
    }
}

function toggleRack(rackId, event) {
    if (event) event.stopPropagation();
    const rack = document.querySelector(`.tree-rack[data-rack-id="${rackId}"]`);
    if (!rack) return;
    
    rack.classList.toggle('expanded');
    
    const toggle = rack.querySelector('.tree-rack-header .toggle');
    if (toggle) {
        toggle.textContent = rack.classList.contains('expanded') ? '▼' : '▶';
    }
}

function expandAll() {
    document.querySelectorAll('.tree-zone').forEach(z => z.classList.add('expanded'));
    document.querySelectorAll('.tree-rack').forEach(r => r.classList.add('expanded'));
    document.querySelectorAll('.tree-zone-header .toggle').forEach(t => t.textContent = '▼');
    document.querySelectorAll('.tree-rack-header .toggle').forEach(t => t.textContent = '▼');
}

function collapseAll() {
    document.querySelectorAll('.tree-zone').forEach(z => z.classList.remove('expanded'));
    document.querySelectorAll('.tree-rack').forEach(r => r.classList.remove('expanded'));
    document.querySelectorAll('.tree-zone-header .toggle').forEach(t => t.textContent = '▶');
    document.querySelectorAll('.tree-rack-header .toggle').forEach(t => t.textContent = '▶');
}

// ============================================================
// МОДАЛЬНОЕ ОКНО: ЗОНА
// ============================================================

function openZoneModal(id = null) {
    const modal = document.getElementById('zoneModal');
    const title = document.getElementById('zoneModalTitle');
    const form = document.getElementById('zoneForm');
    const activeGroup = document.getElementById('zoneActiveGroup');
    
    form.reset();
    document.getElementById('zoneWarehouseId').value = WAREHOUSE_ID;
    
    if (id) {
        // Редактирование
        const zone = findZone(id);
        if (!zone) return;
        
        title.textContent = '✏️ Редактировать зону';
        document.getElementById('zoneId').value = zone.id;
        document.getElementById('zoneName').value = zone.name || '';
        document.getElementById('zoneDescription').value = zone.description || '';
        document.getElementById('zoneIsActive').checked = zone.is_active !== 0;
        activeGroup.style.display = 'block';
    } else {
        // Создание
        title.textContent = '➕ Добавить зону';
        document.getElementById('zoneId').value = '';
        document.getElementById('zoneName').value = '';
        document.getElementById('zoneDescription').value = '';
        document.getElementById('zoneIsActive').checked = true;
        activeGroup.style.display = 'none';
    }
    
    modal.classList.add('active');
    setTimeout(() => document.getElementById('zoneName').focus(), 100);
}

function closeZoneModal() {
    document.getElementById('zoneModal').classList.remove('active');
}

async function saveZone(event) {
    event.preventDefault();
    
    const btn = document.getElementById('zoneSaveBtn');
    const id = document.getElementById('zoneId').value;
    const isEdit = !!id;
    
    const data = {
        warehouse_id: WAREHOUSE_ID,
        name: document.getElementById('zoneName').value.trim(),
        description: document.getElementById('zoneDescription').value.trim(),
        is_active: document.getElementById('zoneIsActive').checked,
    };
    
    if (!data.name) {
        showToast('❌ Введите название зоны', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';
    
    try {
        const url = isEdit ? `/api/admin/zones/${id}` : '/api/admin/zones';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Зона ${isEdit ? 'обновлена' : 'создана'}`, 'success');
            closeZoneModal();
            await loadWarehouseTree();
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
// МОДАЛЬНОЕ ОКНО: СТЕЛЛАЖ
// ============================================================

function openRackModal(id = null, zoneId = null) {
    const modal = document.getElementById('rackModal');
    const title = document.getElementById('rackModalTitle');
    const form = document.getElementById('rackForm');
    const activeGroup = document.getElementById('rackActiveGroup');
    
    form.reset();
    
    if (id) {
        // Редактирование
        const rack = findRack(id);
        if (!rack) return;
        
        title.textContent = '✏️ Редактировать стеллаж';
        document.getElementById('rackId').value = rack.id;
        document.getElementById('rackZoneId').value = rack.zone_id;
        document.getElementById('rackName').value = rack.name || '';
        document.getElementById('rackDescription').value = rack.description || '';
        document.getElementById('rackIsActive').checked = rack.is_active !== 0;
        activeGroup.style.display = 'block';
    } else {
        // Создание
        title.textContent = '➕ Добавить стеллаж';
        document.getElementById('rackId').value = '';
        document.getElementById('rackZoneId').value = zoneId || '';
        document.getElementById('rackName').value = '';
        document.getElementById('rackDescription').value = '';
        document.getElementById('rackIsActive').checked = true;
        activeGroup.style.display = 'none';
    }
    
    modal.classList.add('active');
    setTimeout(() => document.getElementById('rackName').focus(), 100);
}

function closeRackModal() {
    document.getElementById('rackModal').classList.remove('active');
}

async function saveRack(event) {
    event.preventDefault();
    
    const btn = document.getElementById('rackSaveBtn');
    const id = document.getElementById('rackId').value;
    const zoneId = document.getElementById('rackZoneId').value;
    const isEdit = !!id;
    
    const data = {
        zone_id: zoneId,
        name: document.getElementById('rackName').value.trim(),
        description: document.getElementById('rackDescription').value.trim(),
        is_active: document.getElementById('rackIsActive').checked,
    };
    
    if (!data.name) {
        showToast('❌ Введите название стеллажа', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';
    
    try {
        const url = isEdit ? `/api/admin/racks/${id}` : '/api/admin/racks';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Стеллаж ${isEdit ? 'обновлён' : 'создан'}`, 'success');
            closeRackModal();
            await loadWarehouseTree();
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
// МОДАЛЬНОЕ ОКНО: ЯЧЕЙКА
// ============================================================

function openCellModal(id = null, rackId = null) {
    const modal = document.getElementById('cellModal');
    const title = document.getElementById('cellModalTitle');
    const form = document.getElementById('cellForm');
    const activeGroup = document.getElementById('cellActiveGroup');
    
    form.reset();
    
    if (id) {
        // Редактирование
        const cell = findCell(id);
        if (!cell) return;
        
        title.textContent = '✏️ Редактировать ячейку';
        document.getElementById('cellId').value = cell.id;
        document.getElementById('cellRackId').value = cell.rack_id;
        document.getElementById('cellName').value = cell.name || '';
        document.getElementById('cellCode').value = cell.code || '';
        document.getElementById('cellCapacity').value = cell.capacity || '';
        document.getElementById('cellDescription').value = cell.description || '';
        document.getElementById('cellIsActive').checked = cell.is_active !== 0;
        activeGroup.style.display = 'block';
    } else {
        // Создание
        title.textContent = '➕ Добавить ячейку';
        document.getElementById('cellId').value = '';
        document.getElementById('cellRackId').value = rackId || '';
        document.getElementById('cellName').value = '';
        document.getElementById('cellCode').value = '';
        document.getElementById('cellCapacity').value = '';
        document.getElementById('cellDescription').value = '';
        document.getElementById('cellIsActive').checked = true;
        activeGroup.style.display = 'none';
    }
    
    modal.classList.add('active');
    setTimeout(() => document.getElementById('cellName').focus(), 100);
}

function closeCellModal() {
    document.getElementById('cellModal').classList.remove('active');
}

async function saveCell(event) {
    event.preventDefault();
    
    const btn = document.getElementById('cellSaveBtn');
    const id = document.getElementById('cellId').value;
    const rackId = document.getElementById('cellRackId').value;
    const isEdit = !!id;
    
    const data = {
        rack_id: rackId,
        name: document.getElementById('cellName').value.trim(),
        code: document.getElementById('cellCode').value.trim(),
        capacity: document.getElementById('cellCapacity').value || null,
        description: document.getElementById('cellDescription').value.trim(),
        is_active: document.getElementById('cellIsActive').checked,
    };
    
    if (!data.name) {
        showToast('❌ Введите название ячейки', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';
    
    try {
        const url = isEdit ? `/api/admin/cells/${id}` : '/api/admin/cells';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Ячейка ${isEdit ? 'обновлена' : 'создана'}`, 'success');
            closeCellModal();
            await loadWarehouseTree();
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
// ПРОСМОТР ЯЧЕЙКИ
// ============================================================

async function viewCell(cellId) {
    const modal = document.getElementById('cellViewModal');
    const title = document.getElementById('cellViewTitle');
    const body = document.getElementById('cellViewBody');
    
    body.innerHTML = '<div class="catalog-loading">⏳ Загрузка...</div>';
    modal.classList.add('active');
    
    try {
        const [cell, equipment] = await Promise.all([
            fetch(`/api/admin/cells/${cellId}`).then(r => r.json()),
            fetch(`/api/admin/cells/${cellId}/equipment`).then(r => r.json()),
        ]);
        
        title.textContent = `📦 ${cell.name}`;
        
        // Информация о ячейке
        const capacityText = cell.capacity ? ` / ${cell.capacity}` : '';
        
        let html = `
            <div class="cell-view-header">
                <div class="cell-view-icon">📦</div>
                <div class="cell-view-info">
                    <h2>${escapeHtml(cell.name)}</h2>
                    ${cell.code ? `<div class="cell-view-code">${escapeHtml(cell.code)}</div>` : ''}
                    <div style="font-size: 13px; margin-top: 5px; opacity: 0.9;">
                        📍 ${cell.warehouse_name} → ${cell.zone_name} → ${cell.rack_name}
                    </div>
                </div>
            </div>
            
            <div class="cell-view-section">
                <h4>ℹ️ Информация</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Вместимость</label>
                        <div class="value">${cell.capacity || 'без ограничений'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Занято</label>
                        <div class="value">${equipment.length}${capacityText}</div>
                    </div>
                    <div class="detail-item">
                        <label>Склад</label>
                        <div class="value">${cell.warehouse_name}</div>
                    </div>
                    <div class="detail-item">
                        <label>Зона / Стеллаж</label>
                        <div class="value">${cell.zone_name} / ${cell.rack_name}</div>
                    </div>
                </div>
                ${cell.description ? `
                    <div class="detail-item" style="margin-top: 12px;">
                        <label>Описание</label>
                        <div class="value">${escapeHtml(cell.description)}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="cell-view-section">
                <h4>🔧 Техника в ячейке (${equipment.length})</h4>
        `;
        
        if (equipment.length === 0) {
            html += `
                <div class="cell-view-empty">
                    <span class="emoji">📭</span>
                    <div>Ячейка пуста</div>
                </div>
            `;
        } else {
            html += '<div class="equipment-cards">';
            equipment.forEach(eq => {
                html += `
                    <div class="equipment-card">
                        <div class="equipment-card-header">
                            <span class="equipment-card-inv">${escapeHtml(eq.inventory_number)}</span>
                            <span class="status-badge status-${eq.status}">${eq.status}</span>
                        </div>
                        <div class="equipment-card-body">
                            <div class="equipment-card-name">${escapeHtml(eq.name)}</div>
                            ${eq.model ? `<div class="equipment-card-model">${escapeHtml(eq.model)}</div>` : ''}
                            ${eq.type_name ? `<div class="equipment-card-manufacturer">${eq.type_icon || '📦'} ${escapeHtml(eq.type_name)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
        
        body.innerHTML = html;
    } catch (error) {
        console.error('Ошибка:', error);
        body.innerHTML = `
            <div class="cell-view-empty">
                <span class="emoji">❌</span>
                <div>Ошибка загрузки</div>
            </div>
        `;
    }
}

function closeCellViewModal() {
    document.getElementById('cellViewModal').classList.remove('active');
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================

function deleteZoneItem(id, name, racksCount) {
    deleteTarget = { type: 'zone', id, name };
    
    document.getElementById('deleteMessage').innerHTML = 
        `Вы уверены, что хотите удалить зону <strong>"${escapeHtml(name)}"</strong>?`;
    
    const warning = document.getElementById('deleteWarning');
    const warningText = document.getElementById('deleteWarningText');
    
    if (racksCount > 0) {
        warningText.textContent = `В зоне ${racksCount} стеллажей. Удаление невозможно, пока в зоне есть стеллажи.`;
        warning.style.display = 'flex';
    } else {
        warning.style.display = 'none';
    }
    
    document.getElementById('deleteModal').classList.add('active');
}

function deleteRackItem(id, name, cellsCount) {
    deleteTarget = { type: 'rack', id, name };
    
    document.getElementById('deleteMessage').innerHTML = 
        `Вы уверены, что хотите удалить стеллаж <strong>"${escapeHtml(name)}"</strong>?`;
    
    const warning = document.getElementById('deleteWarning');
    const warningText = document.getElementById('deleteWarningText');
    
    if (cellsCount > 0) {
        warningText.textContent = `В стеллаже ${cellsCount} ячеек. Удаление невозможно, пока в стеллаже есть ячейки.`;
        warning.style.display = 'flex';
    } else {
        warning.style.display = 'none';
    }
    
    document.getElementById('deleteModal').classList.add('active');
}

function deleteCellItem(id, name, equipmentCount) {
    deleteTarget = { type: 'cell', id, name };
    
    document.getElementById('deleteMessage').innerHTML = 
        `Вы уверены, что хотите удалить ячейку <strong>"${escapeHtml(name)}"</strong>?`;
    
    const warning = document.getElementById('deleteWarning');
    const warningText = document.getElementById('deleteWarningText');
    
    if (equipmentCount > 0) {
        warningText.textContent = `В ячейке ${equipmentCount} единиц техники. Удаление невозможно, пока ячейка не пуста.`;
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
    
    const { type, id } = deleteTarget;
    const url = type === 'zone' 
        ? `/api/admin/zones/${id}` 
        : type === 'rack'
        ? `/api/admin/racks/${id}`
        : `/api/admin/cells/${id}`;
    
    try {
        const response = await fetch(url, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            const typeNames = { zone: 'Зона', rack: 'Стеллаж', cell: 'Ячейка' };
            showToast(`✅ ${typeNames[type]} удалена`, 'success');
            closeDeleteModal();
            await loadWarehouseTree();
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ ИНФОРМАЦИИ О СКЛАДЕ
// ============================================================

function editWarehouseInfo() {
    // Переходим на страницу складов
    window.location.href = '/admin/warehouses';
}

// ============================================================
// ПОИСК ПО ДЕРЕВУ
// ============================================================

function findZone(id) {
    if (!tree || !tree.zones) return null;
    return tree.zones.find(z => z.id === id);
}

function findRack(id) {
    if (!tree || !tree.zones) return null;
    for (const zone of tree.zones) {
        if (zone.racks) {
            const rack = zone.racks.find(r => r.id === id);
            if (rack) return rack;
        }
    }
    return null;
}

function findCell(id) {
    if (!tree || !tree.zones) return null;
    for (const zone of tree.zones) {
        if (zone.racks) {
            for (const rack of zone.racks) {
                if (rack.cells) {
                    const cell = rack.cells.find(c => c.id === id);
                    if (cell) return cell;
                }
            }
        }
    }
    return null;
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
        if (e.target.id === 'zoneModal') closeZoneModal();
        if (e.target.id === 'rackModal') closeRackModal();
        if (e.target.id === 'cellModal') closeCellModal();
        if (e.target.id === 'cellViewModal') closeCellViewModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeZoneModal();
        closeRackModal();
        closeCellModal();
        closeCellViewModal();
        closeDeleteModal();
    }
});