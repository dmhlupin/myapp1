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
    const status = document.getElementById('filterStatus').value;
    
    const tbody = document.getElementById('equipmentTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr:not(.empty-row)');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowCategoryId = row.dataset.categoryId || '';
        const rowTypeId = row.dataset.typeId || '';
        
        let visible = true;
        
        // Фильтр по категории
        if (categoryId && rowCategoryId !== categoryId) {
            visible = false;
        }
        
        // Фильтр по типу
        if (typeId && rowTypeId !== typeId) {
            visible = false;
        }
        
        // 🆕 Фильтр по статусу — через класс
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
                <td colspan="7" class="empty-state">
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