// public/js/admin-edit.js
// Логика формы редактирования техники

let categories = [];

// ID, которые пришли с сервера
const equipmentId = parseInt(document.getElementById('equipmentId')?.value || '0');
const originalCategoryId = document.getElementById('currentCategoryId')?.value || '';
const originalTypeId = document.getElementById('currentTypeId')?.value || '';

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('✏️ Форма редактирования: ID =', equipmentId);
    
    if (!equipmentId || isNaN(equipmentId)) {
        showToast('❌ Ошибка: ID техники не указан', 'error');
        setTimeout(() => window.location.href = '/admin', 2000);
        return;
    }
    
    // Загружаем категории
    await loadCategories();
    
    // Если категория уже выбрана — загружаем типы
    if (originalCategoryId) {
        await loadTypesForCategory(originalCategoryId, originalTypeId);
    }
});

/**
 * Загрузить категории
 */
async function loadCategories() {
    try {
        const response = await fetch('/api/admin/categories');
        categories = await response.json();
        
        const select = document.getElementById('category_id');
        if (!select) return;
        
        select.innerHTML = '<option value="">— Выберите категорию —</option>' +
            categories.map(cat => `
                <option value="${cat.id}" ${String(cat.id) === String(originalCategoryId) ? 'selected' : ''}>
                    ${cat.icon || '📁'} ${escapeHtml(cat.name)}
                </option>
            `).join('');
        
        console.log(`✅ Загружено категорий: ${categories.length}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        showToast('❌ Ошибка загрузки категорий', 'error');
    }
}

/**
 * Загрузить типы для конкретной категории
 * @param {string} categoryId — ID категории
 * @param {string} selectedTypeId — ID типа для предзаполнения (опционально)
 */
async function loadTypesForCategory(categoryId, selectedTypeId = '') {
    const typeSelect = document.getElementById('type_id');
    
    typeSelect.innerHTML = '<option value="">— Загрузка... —</option>';
    typeSelect.disabled = true;
    
    if (!categoryId) {
        typeSelect.innerHTML = '<option value="">— Сначала выберите категорию —</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/types?category_id=${categoryId}`);
        const types = await response.json();
        
        if (types.length === 0) {
            typeSelect.innerHTML = '<option value="">— Нет типов в категории —</option>';
            return;
        }
        
        typeSelect.innerHTML = '<option value="">— Выберите тип —</option>' +
            types.map(type => `
                <option value="${type.id}" ${String(type.id) === String(selectedTypeId) ? 'selected' : ''}>
                    ${type.icon || '📦'} ${escapeHtml(type.name)}
                </option>
            `).join('');
        
        typeSelect.disabled = false;
        console.log(`✅ Загружено типов: ${types.length}, выбран: ${selectedTypeId || 'нет'}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки типов:', error);
        typeSelect.innerHTML = '<option value="">— Ошибка загрузки —</option>';
    }
}

/**
 * Обработка смены категории
 * Если категория изменилась — сбрасываем тип
 */
async function onCategoryChange() {
    const categoryId = document.getElementById('category_id').value;
    const currentTypeId = document.getElementById('type_id').value;
    
    // Если категория не изменилась — оставляем тип
    if (String(categoryId) === String(originalCategoryId)) {
        await loadTypesForCategory(categoryId, currentTypeId);
    } else {
        // Категория изменилась — сбрасываем тип
        await loadTypesForCategory(categoryId);
        
        // Сообщаем пользователю
        if (currentTypeId) {
            showToast('ℹ️ Тип сброшен, так как изменилась категория', 'info');
        }
    }
}

// ============================================================
// ОТПРАВКА ФОРМЫ
// ============================================================

async function submitForm(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Обновление...';

    const formData = {
        inventory_number: document.getElementById('inventory_number').value.trim(),
        category_id: document.getElementById('category_id').value || null,
        type_id: document.getElementById('type_id').value || null,
        name: document.getElementById('name').value.trim(),
        model: document.getElementById('model').value.trim(),
        serial_number: document.getElementById('serial_number').value.trim(),
        manufacturer: document.getElementById('manufacturer').value.trim(),
        purchase_date: document.getElementById('purchase_date').value || null,
        warranty_until: document.getElementById('warranty_until').value || null,
        status: document.getElementById('status').value,
        description: document.getElementById('description').value.trim()
    };
    
    // Валидация
    if (!formData.inventory_number) {
        showToast('❌ Введите инвентарный номер', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
        return;
    }
    if (!formData.category_id) {
        showToast('❌ Выберите категорию', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
        return;
    }
    if (!formData.type_id) {
        showToast('❌ Выберите тип', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
        return;
    }
    if (!formData.name) {
        showToast('❌ Введите название', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
        return;
    }

    try {
        const response = await fetch(`/api/admin/equipment/${equipmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            let message = '✅ Техника успешно обновлена!';
            if (result.returned) {
                message += ' Техника возвращена от пользователя.';
            }
            showToast(message, 'success');
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1500);
        } else {
            showToast('❌ ' + result.error, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Сохранить';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка при обновлении техники', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
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