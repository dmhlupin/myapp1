// public/js/admin-add.js
// Логика формы добавления техники

let categories = [];

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('➕ Форма добавления техники: загрузка справочника...');
    
    // Загружаем категории
    await loadCategories();
    
    // Генерируем placeholder для инвентарного номера
    const invInput = document.getElementById('inventory_number');
    if (invInput && !invInput.value) {
        invInput.placeholder = generateInventoryNumber();
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
        
        // Сохраняем текущее значение
        const currentValue = select.value;
        
        // Заполняем
        select.innerHTML = '<option value="">— Выберите категорию —</option>' +
            categories.map(cat => `
                <option value="${cat.id}">
                    ${cat.icon || '📁'} ${escapeHtml(cat.name)}
                </option>
            `).join('');
        
        // Восстанавливаем
        if (currentValue) select.value = currentValue;
        
        console.log(`✅ Загружено категорий: ${categories.length}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        showToast('❌ Ошибка загрузки категорий', 'error');
    }
}

/**
 * Обработка смены категории — загружаем типы
 */
async function onCategoryChange() {
    const categoryId = document.getElementById('category_id').value;
    const typeSelect = document.getElementById('type_id');
    
    // Сбрасываем тип
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
                <option value="${type.id}">
                    ${type.icon || '📦'} ${escapeHtml(type.name)}
                </option>
            `).join('');
        
        typeSelect.disabled = false;
        console.log(`✅ Загружено типов: ${types.length}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки типов:', error);
        typeSelect.innerHTML = '<option value="">— Ошибка загрузки —</option>';
    }
}

// ============================================================
// ОТПРАВКА ФОРМЫ
// ============================================================

async function submitForm(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Сохранение...';

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
        const response = await fetch('/api/admin/equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showToast('✅ Техника успешно добавлена!', 'success');
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
        showToast('❌ Ошибка при добавлении техники', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Сохранить';
    }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

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

/**
 * Генерация случайного инвентарного номера
 */
function generateInventoryNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `Например: EQ-${year}-${random}`;
}