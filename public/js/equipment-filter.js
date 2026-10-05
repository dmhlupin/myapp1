// public/js/equipment-filter.js
// Логика фильтрации техники на странице /equipment

let allTypes = [];

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Читаем типы из data-атрибута
    const pageData = document.getElementById('pageData');
    
    if (pageData && pageData.dataset.types) {
        try {
            allTypes = JSON.parse(pageData.dataset.types);
            console.log(`✅ Загружено типов: ${allTypes.length}`);
        } catch (e) {
            console.error('❌ Ошибка парсинга типов:', e);
            allTypes = [];
        }
    } else {
        console.warn('⚠️ Данные типов не найдены на странице');
    }
});

// ============================================================
// ФИЛЬТРАЦИЯ
// ============================================================

/**
 * При смене категории — обновляем список типов + применяем фильтр
 */
function onCategoryFilterChange() {
    const categoryId = document.getElementById('filterCategory').value;
    const typeSelect = document.getElementById('filterType');
    
    // Обновляем список типов
    if (categoryId) {
        const filteredTypes = allTypes.filter(t => String(t.category_id) === String(categoryId));
        
        typeSelect.innerHTML = '<option value="">Все типы</option>' +
            filteredTypes.map(t => `
                <option value="${t.id}">
                    ${t.icon || '📦'} ${escapeHtml(t.name)} (${t.equipment_count || 0})
                </option>
            `).join('');
    } else {
        typeSelect.innerHTML = '<option value="">Все типы</option>';
    }
    
    // Сбрасываем выбор типа и применяем фильтр
    typeSelect.value = '';
    applyFilters();
}

/**
 * При смене типа — применяем фильтр
 */
function onTypeFilterChange() {
    applyFilters();
}

/**
 * Применить все фильтры
 */
function applyFilters() {
    const categoryId = document.getElementById('filterCategory').value;
    const typeId = document.getElementById('filterType').value;
    const warehouseId = document.getElementById('filterWarehouse').value;
    const workplaceId = document.getElementById('filterWorkplace')?.value || '';
    const status = document.getElementById('filterStatus').value;
    
    const tbody = document.getElementById('equipmentTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr:not(.empty-row)');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowCategoryId = row.dataset.categoryId || '';
        const rowTypeId = row.dataset.typeId || '';
        const rowWarehouseId = row.dataset.warehouseId || '';
        const rowWorkplaceId = row.dataset.workplaceId || '';
        
        let visible = true;
        
        // Фильтр по категории
        if (categoryId && rowCategoryId !== categoryId) {
            visible = false;
        }
        
        // Фильтр по типу
        if (typeId && rowTypeId !== typeId) {
            visible = false;
        }
        
        // 🆕 Фильтр по складу
        if (warehouseId) {
            if (warehouseId === '__none__') {
                // "Не на складе" — техника без warehouse_id
                if (rowWarehouseId) {
                    visible = false;
                }
            } else {
                // Конкретный склад
                if (rowWarehouseId !== warehouseId) {
                    visible = false;
                }
            }
        }
        
        // 🆕 Фильтр по рабочему месту
        if (workplaceId) {
            if (workplaceId === '__none__') {
                // "Не на рабочем месте" — техника без workplace_id
                if (rowWorkplaceId) {
                    visible = false;
                }
            } else {
                // Конкретное рабочее место
                if (rowWorkplaceId !== workplaceId) {
                    visible = false;
                }
            }
        }

        // Фильтр по статусу
        if (status) {
            const statusCell = row.querySelector('.status-badge');
            const hasStatusClass = statusCell && statusCell.classList.contains(`status-${status}`);
            if (!hasStatusClass) {
                visible = false;
            }
        }
        
        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });
    
    showEmptyStateIfNeeded(visibleCount);
}

/**
 * Показать сообщение "не найдено"
 */
function showEmptyStateIfNeeded(count) {
    const tbody = document.getElementById('equipmentTableBody');
    if (!tbody) return;
    
    let emptyRow = tbody.querySelector('.empty-row');
    
    if (count === 0) {
        if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td colspan="8" class="empty-state">
                    <span class="emoji">🔍</span>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте изменить фильтры</p>
                </td>
            `;
            tbody.appendChild(emptyRow);
        }
        emptyRow.style.display = '';
    } else if (emptyRow) {
        emptyRow.style.display = 'none';
    }
}

/**
 * Сбросить все фильтры
 */
function resetFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').innerHTML = '<option value="">Все типы</option>';
    document.getElementById('filterWarehouse').value = '';
    document.getElementById('filterWorkplace').value = '';   // 🆕
    document.getElementById('filterStatus').value = '';
    
    // Показываем все строки
    const rows = document.querySelectorAll('#equipmentTableBody tr:not(.empty-row)');
    rows.forEach(row => {
        row.style.display = '';
    });
    
    // Скрываем пустое состояние
    const emptyRow = document.querySelector('#equipmentTableBody .empty-row');
    if (emptyRow) {
        emptyRow.style.display = 'none';
    }
    
    if (typeof showToast === 'function') {
        showToast('🔄 Фильтры сброшены', 'info');
    }
}


// ============================================================
// ПРОСМОТР КАРТОЧКИ ТЕХНИКИ
// ============================================================

/**
 * Открыть карточку техники
 */
async function viewEquipmentFromList(equipmentId) {
    try {
        const response = await fetch(`/api/admin/equipment/${equipmentId}/details`);
        
        if (!response.ok) {
            showToast('❌ Ошибка загрузки', 'error');
            return;
        }
        
        const data = await response.json();
        
        if (!data.equipment) {
            showToast('❌ Техника не найдена', 'error');
            return;
        }
        
        renderEquipmentCard(data);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
    }
}

/**
 * Отрисовать карточку техники
 */
function renderEquipmentCard(data) {
    const { equipment, stats, history } = data;
    
    // Форматирование дат
    const purchaseDate = equipment.purchase_date
        ? new Date(equipment.purchase_date).toLocaleDateString('ru-RU')
        : '—';
    const warrantyDate = equipment.warranty_until
        ? new Date(equipment.warranty_until).toLocaleDateString('ru-RU')
        : '—';
    
    // Проверка гарантии
    const warrantyExpired = equipment.warranty_until && new Date(equipment.warranty_until) < new Date();
    const warrantyBadge = warrantyExpired
        ? '<span class="badge badge-danger">⚠️ Истекла</span>'
        : (equipment.warranty_until ? '<span class="badge badge-success">✅ Действует</span>' : '');
    
    // Статус
    const statusLabels = {
        'available': { label: 'Доступна', class: 'badge-success', icon: '✅' },
        'assigned': { label: 'Назначена', class: 'badge-info', icon: '👤' },
        'maintenance': { label: 'В ремонте', class: 'badge-warning', icon: '🔧' },
        'retired': { label: 'Списана', class: 'badge-danger', icon: '❌' }
    };
    const statusInfo = statusLabels[equipment.status] || statusLabels.available;
    const statusBadge = `<span class="badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span>`;
    
    // Категория / тип
    const categoryHtml = equipment.category_name
        ? `<span class="badge badge-muted">📁 ${escapeHtml(equipment.category_name)}</span>`
        : '';
    const typeHtml = equipment.type_name
        ? `<span class="badge badge-muted">📦 ${escapeHtml(equipment.type_name)}</span>`
        : '';
    
    // Текущий владелец
    let currentUserHtml = '';
    if (stats.current_user) {
        const u = stats.current_user;
        const initials = getInitials(u.full_name || u.username);
        const assignedDate = new Date(u.assigned_date).toLocaleDateString('ru-RU');
        currentUserHtml = `
            <div class="current-user-card">
                <div class="current-user-avatar">${initials}</div>
                <div class="current-user-info">
                    <div class="current-user-name">${escapeHtml(u.full_name || u.username)}</div>
                    <div class="current-user-dept">${escapeHtml(u.department || 'Без отдела')} · @${escapeHtml(u.username)}</div>
                    <div class="current-user-date">📅 Выдано: ${assignedDate}</div>
                </div>
                <span class="current-user-status">Активно</span>
            </div>
        `;
    } else {
        currentUserHtml = `
            <div class="empty-equipment">
                <span class="empty-icon">📭</span>
                <p>Техника не назначена пользователю</p>
            </div>
        `;
    }
    
    // Место хранения
    let locationHtml = '';
    if (equipment.cell_id) {
        locationHtml = `
            <div class="user-detail-section">
                <h4>📍 Место хранения</h4>
                <div class="detail-item" style="background: var(--info-bg); border-left: 3px solid var(--info); padding: 12px;">
                    <div class="value">
                        ${escapeHtml(equipment.warehouse_name || '—')} 
                        → ${escapeHtml(equipment.zone_name || '—')} 
                        → ${escapeHtml(equipment.rack_name || '—')} 
                        → <strong>${escapeHtml(equipment.cell_name || '—')}${equipment.cell_code ? ` [${equipment.cell_code}]` : ''}</strong>
                    </div>
                </div>
            </div>
        `;
    }
    
    // История
    let historyHtml = '';
    if (history.length === 0) {
        historyHtml = '<p style="color: var(--text-muted); text-align: center; padding: 15px;">История пуста</p>';
    } else {
        historyHtml = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Пользователь</th>
                        <th>Отдел</th>
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
                ? '<span class="badge badge-info">Активна</span>'
                : '<span class="badge badge-success">Возвращена</span>';
            
            historyHtml += `
                <tr>
                    <td>
                        <div class="history-user">
                            <span class="history-user-avatar">${getInitials(h.full_name || h.username)}</span>
                            <span>${escapeHtml(h.full_name || h.username)}</span>
                        </div>
                    </td>
                    <td>${escapeHtml(h.department || '—')}</td>
                    <td>${assignedDate}</td>
                    <td>${returnedDate}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
        historyHtml += '</tbody></table>';
    }
    
    // Собираем
    const body = document.getElementById('viewEquipmentBody');
    body.innerHTML = `
        <div class="equipment-header-card">
            <div class="equipment-header-icon">🔧</div>
            <div class="equipment-header-info">
                <h2>${escapeHtml(equipment.name)}</h2>
                <div class="equipment-header-inv">${escapeHtml(equipment.inventory_number)}</div>
                <div class="equipment-header-badges">
                    ${statusBadge}
                    ${categoryHtml}
                    ${typeHtml}
                </div>
            </div>
        </div>
        
        <div class="user-stats">
            <div class="user-stat">
                <div class="user-stat-number active">${stats.active}</div>
                <div class="user-stat-label">Сейчас назначена</div>
            </div>
            <div class="user-stat">
                <div class="user-stat-number total">${stats.total}</div>
                <div class="user-stat-label">Всего выдач</div>
            </div>
            <div class="user-stat">
                <div class="user-stat-number returned">${stats.returned}</div>
                <div class="user-stat-label">Возвращено</div>
            </div>
        </div>
        
        <div class="user-detail-section">
            <h4>📋 Информация о технике</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Название</label>
                    <div class="value">${escapeHtml(equipment.name)}</div>
                </div>
                <div class="detail-item">
                    <label>Модель</label>
                    <div class="value">${escapeHtml(equipment.model || '—')}</div>
                </div>
                <div class="detail-item">
                    <label>Производитель</label>
                    <div class="value">${escapeHtml(equipment.manufacturer || '—')}</div>
                </div>
                <div class="detail-item">
                    <label>Серийный номер</label>
                    <div class="value">${escapeHtml(equipment.serial_number || '—')}</div>
                </div>
                <div class="detail-item">
                    <label>Дата покупки</label>
                    <div class="value">${purchaseDate}</div>
                </div>
                <div class="detail-item">
                    <label>Гарантия до</label>
                    <div class="value">${warrantyDate} ${warrantyBadge}</div>
                </div>
            </div>
            ${equipment.description ? `
                <div class="detail-item" style="margin-top: 12px;">
                    <label>Описание</label>
                    <div class="value">${escapeHtml(equipment.description)}</div>
                </div>
            ` : ''}
        </div>
        
        ${locationHtml}
        
        <div class="user-detail-section">
            <h4>👤 Текущий владелец</h4>
            ${currentUserHtml}
        </div>
        
        <div class="user-detail-section">
            <h4>📜 История использования (${stats.total})</h4>
            ${historyHtml}
        </div>
    `;
    
    document.getElementById('viewEquipmentModal').classList.add('active');
}

function closeViewEquipmentModal() {
    const modal = document.getElementById('viewEquipmentModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Получить инициалы
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(p => p);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Экранирование HTML
 */
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

// Закрытие модалки по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeViewEquipmentModal();
    }
});

// Закрытие модалки по клику на оверлей
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'viewEquipmentModal') {
            closeViewEquipmentModal();
        }
    }
});