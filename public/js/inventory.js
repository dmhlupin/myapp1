// public/js/inventory.js
// Логика страницы инвентаризации

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let summary = [];
let totals = {};
let currentWarehouseId = null;
let currentWarehouse = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Страница инвентаризации: загрузка...');
    await loadSummary();
    await loadTotals();
});

/**
 * Загрузить сводку по складам
 */
async function loadSummary() {
    const container = document.getElementById('warehouseSummary');
    if (!container) return;
    
    container.innerHTML = '<div class="catalog-loading">⏳ Загрузка...</div>';
    
    try {
        const response = await fetch('/api/admin/inventory/summary');
        summary = await response.json();
        
        console.log(`✅ Загружено складов: ${summary.length}`);
        renderSummary();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        container.innerHTML = `
            <div class="inventory-empty">
                <span class="emoji">❌</span>
                <div>Ошибка загрузки</div>
            </div>
        `;
    }
}

/**
 * Загрузить общие итоги
 */
async function loadTotals() {
    try {
        const response = await fetch('/api/admin/inventory/totals');
        totals = await response.json();
        
        updateTotals();
        updateWarning();
    } catch (error) {
        console.error('❌ Ошибка загрузки итогов:', error);
    }
}

/**
 * Обновить карточки итогов
 */
function updateTotals() {
    const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value || 0;
    };
    
    setText('[data-stat="warehouses"]', totals.total_warehouses);
    setText('[data-stat="zones"]', totals.total_zones);
    setText('[data-stat="racks"]', totals.total_racks);
    setText('[data-stat="cells"]', totals.total_cells);
    setText('[data-stat="on_stock"]', totals.equipment_on_stock);
    setText('[data-stat="assigned"]', totals.equipment_assigned);
}

/**
 * Показать/скрыть warning о технике без ячейки
 */
function updateWarning() {
    const block = document.getElementById('warningBlock');
    const count = document.getElementById('warningCount');
    
    if (!block || !count) return;
    
    const withoutCell = totals.available_without_cell || 0;
    
    if (withoutCell > 0) {
        count.textContent = withoutCell;
        block.style.display = 'flex';
    } else {
        block.style.display = 'none';
    }
}

// ============================================================
// ОТРИСОВКА СВОДКИ
// ============================================================

function renderSummary() {
    const container = document.getElementById('warehouseSummary');
    if (!container) return;
    
    if (summary.length === 0) {
        container.innerHTML = `
            <div class="inventory-empty">
                <span class="emoji">📭</span>
                <div>Нет активных складов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = summary.map(w => renderWarehouseCard(w)).join('');
}

function renderWarehouseCard(w) {
    // Класс прогресс-бара
    const percent = w.fill_percent || 0;
    let fillClass = 'low';
    if (percent >= 90) fillClass = 'full';
    else if (percent >= 60) fillClass = 'high';
    else if (percent >= 30) fillClass = 'medium';
    
    const cardClasses = ['warehouse-summary-card'];
    if (w.is_default) cardClasses.push('is-default');
    
    return `
        <div class="${cardClasses.join(' ')}" onclick="openWarehouseDetail(${w.id})">
            <div class="ws-header">
                <div class="ws-title">
                    <div class="ws-name">
                        ${escapeHtml(w.name)}
                        ${w.is_default ? '<span class="ws-badge">⭐ По умолчанию</span>' : ''}
                    </div>
                    ${w.address ? `<div class="ws-address">📍 ${escapeHtml(w.address)}</div>` : ''}
                </div>
            </div>
            
            <div class="ws-progress">
                <div class="ws-progress-label">
                    <span>Заполненность</span>
                    <span><strong>${w.equipment_count}</strong> из <strong>${w.total_capacity || w.cells_count}</strong></span>
                </div>
                <div class="ws-progress-bar">
                    <div class="ws-progress-fill ${fillClass}" style="width: ${percent}%"></div>
                </div>
            </div>
            
            <div class="ws-stats">
                <div class="ws-stat">
                    <div class="ws-stat-value zones">${w.zones_count || 0}</div>
                    <div class="ws-stat-label">📍 Зон</div>
                </div>
                <div class="ws-stat">
                    <div class="ws-stat-value racks">${w.racks_count || 0}</div>
                    <div class="ws-stat-label">🗄️ Стелл.</div>
                </div>
                <div class="ws-stat">
                    <div class="ws-stat-value cells">${w.cells_count || 0}</div>
                    <div class="ws-stat-label">📦 Ячеек</div>
                </div>
                <div class="ws-stat">
                    <div class="ws-stat-value equipment">${w.equipment_count || 0}</div>
                    <div class="ws-stat-label">🔧 Техн.</div>
                </div>
            </div>
            
            <div class="ws-actions" onclick="event.stopPropagation()">
                <button onclick="openWarehouseDetail(${w.id})" class="btn btn-primary btn-sm">
                    📋 Открыть инвентаризацию
                </button>
                <a href="/admin/warehouses/${w.id}" class="btn btn-back btn-sm btn-icon-only" title="Дерево склада">
                    🏢
                </a>
            </div>
        </div>
    `;
}

// ============================================================
// ДЕТАЛИ СКЛАДА (модалка)
// ============================================================

async function openWarehouseDetail(warehouseId) {
    currentWarehouseId = warehouseId;
    
    const modal = document.getElementById('warehouseDetailModal');
    const title = document.getElementById('warehouseDetailTitle');
    const body = document.getElementById('warehouseDetailBody');
    
    // Находим склад в сводке
    currentWarehouse = summary.find(w => w.id === warehouseId);
    
    title.textContent = `🏢 ${currentWarehouse?.name || 'Склад'}`;
    body.innerHTML = '<div class="catalog-loading">⏳ Загрузка...</div>';
    modal.classList.add('active');
    
    try {
        // Загружаем инвентаризацию и заполненность параллельно
        const [inventory, occupancy] = await Promise.all([
            fetch(`/api/admin/warehouses/${warehouseId}/inventory`).then(r => r.json()),
            fetch(`/api/admin/warehouses/${warehouseId}/occupancy`).then(r => r.json()),
        ]);
        
        renderWarehouseDetail(inventory, occupancy);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        body.innerHTML = `
            <div class="inventory-empty">
                <span class="emoji">❌</span>
                <div>Ошибка загрузки</div>
            </div>
        `;
    }
}

function renderWarehouseDetail(inventory, occupancy) {
    const body = document.getElementById('warehouseDetailBody');
    const w = currentWarehouse;
    
    // Заголовок
    let html = `
        <div class="wh-detail-header">
            <div class="wh-detail-icon">🏢</div>
            <div class="wh-detail-info">
                <h2>${escapeHtml(w.name)}</h2>
                ${w.address ? `<div class="wh-detail-address">📍 ${escapeHtml(w.address)}</div>` : ''}
            </div>
        </div>
        
        <div class="detail-tabs">
            <button class="detail-tab active" onclick="switchDetailTab('equipment', event)">
                🔧 Техника (${inventory.length})
            </button>
            <button class="detail-tab" onclick="switchDetailTab('occupancy', event)">
                📍 Заполненность (${occupancy.length})
            </button>
        </div>
        
        <!-- Вкладка: Техника -->
        <div id="detailTabEquipment" class="detail-tab-content active">
    `;
    
    if (inventory.length === 0) {
        html += `
            <div class="inventory-empty">
                <span class="emoji">📭</span>
                <div>На складе нет техники</div>
                <div style="font-size: 13px; margin-top: 8px; color: #cbd5e0;">
                    Техника появится, если ей назначить ячейку
                </div>
            </div>
        `;
    } else {
        html += `
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Инв. номер</th>
                        <th>Название</th>
                        <th>Модель</th>
                        <th>Категория</th>
                        <th>Тип</th>
                        <th>Место хранения</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        inventory.forEach(eq => {
            const location = eq.cell_code 
                ? `${escapeHtml(eq.zone_name)} → ${escapeHtml(eq.rack_name)} → <strong>${escapeHtml(eq.cell_code)}</strong>`
                : `${escapeHtml(eq.zone_name)} → ${escapeHtml(eq.rack_name)} → ${escapeHtml(eq.cell_name)}`;
            
            html += `
                <tr>
                    <td><strong>${escapeHtml(eq.inventory_number)}</strong></td>
                    <td>${escapeHtml(eq.name)}</td>
                    <td>${escapeHtml(eq.model || '—')}</td>
                    <td>${eq.category_icon || '📁'} ${escapeHtml(eq.category_name || '—')}</td>
                    <td>${eq.type_icon || '📦'} ${escapeHtml(eq.type_name || '—')}</td>
                    <td style="font-size: 12px;">${location}</td>
                    <td><span class="status-badge status-${eq.status}">${eq.status}</span></td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
    }
    
    html += `
        </div>
        
        <!-- Вкладка: Заполненность -->
        <div id="detailTabOccupancy" class="detail-tab-content">
    `;
    
    if (occupancy.length === 0) {
        html += `
            <div class="inventory-empty">
                <span class="emoji">📭</span>
                <div>Нет ячеек</div>
            </div>
        `;
    } else {
        occupancy.forEach(c => {
            const percent = c.percent || 0;
            let fillColor = '#cbd5e0';
            if (percent >= 90) fillColor = '#fc8181';
            else if (percent >= 60) fillColor = '#ed8936';
            else if (percent >= 30) fillColor = '#48bb78';
            else if (percent > 0) fillColor = '#68d391';
            
            const capacityText = c.capacity > 0 
                ? `${c.current_count} / ${c.capacity}`
                : `${c.current_count}`;
            
            html += `
                <div class="occupancy-item">
                    <div class="occupancy-cell">
                        <div class="occupancy-code">${escapeHtml(c.code || '—')}</div>
                        <div class="occupancy-name">${escapeHtml(c.name)} · ${escapeHtml(c.rack_name)}</div>
                    </div>
                    <div class="occupancy-bar">
                        <div class="occupancy-bar-fill" style="width: ${percent}%; background: ${fillColor};"></div>
                    </div>
                    <div class="occupancy-count">${capacityText}</div>
                </div>
            `;
        });
    }
    
    html += `
        </div>
        
        <!-- Кнопки внизу -->
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="/admin/warehouses/${currentWarehouseId}" class="btn btn-primary">
                🏢 Дерево склада
            </a>
            <button onclick="exportInventory(${currentWarehouseId})" class="btn btn-success">
                📥 Экспорт в CSV
            </button>
        </div>
    `;
    
    body.innerHTML = html;
}

function closeWarehouseDetailModal() {
    document.getElementById('warehouseDetailModal').classList.remove('active');
    currentWarehouseId = null;
    currentWarehouse = null;
}

function switchDetailTab(tab, event) {
    // Скрываем все вкладки
    document.querySelectorAll('.detail-tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.detail-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // Показываем нужную
    if (tab === 'equipment') {
        document.getElementById('detailTabEquipment').classList.add('active');
    } else {
        document.getElementById('detailTabOccupancy').classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ============================================================
// ЭКСПОРТ В CSV
// ============================================================

function exportInventory(warehouseId) {
    // Просто открываем ссылку — браузер скачает CSV
    window.location.href = `/api/admin/warehouses/${warehouseId}/inventory/export`;
    showToast('📥 Начинается скачивание CSV...', 'success');
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

// ============================================================
// ЗАКРЫТИЕ МОДАЛКИ
// ============================================================

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'warehouseDetailModal') closeWarehouseDetailModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeWarehouseDetailModal();
    }
});