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
        cell_id: document.getElementById('cellId')?.value || null,  // 🆕
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
// МЕСТО ХРАНЕНИЯ (каскадные селекты)
// ============================================================

let locations = {
    warehouses: [],
    zones: [],
    racks: [],
    cells: [],
};

/**
 * Загрузить список складов
 */
async function loadWarehouses() {
    try {
        const response = await fetch('/api/admin/warehouses');
        const warehouses = await response.json();

        locations.warehouses = warehouses;

        const select = document.getElementById('warehouseId');
        if (!select) return;

        select.innerHTML = '<option value="">— Не указано —</option>' +
            warehouses.map(w => `
                <option value="${w.id}">
                    ${w.is_default ? '⭐ ' : ''}${escapeHtml(w.name)}
                </option>
            `).join('');

        console.log(`✅ Загружено складов: ${warehouses.length}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки складов:', error);
    }
}

/**
 * При смене склада — загружаем зоны
 */
async function onWarehouseChange() {
    const warehouseId = document.getElementById('warehouseId').value;
    const zoneSelect = document.getElementById('zoneId');
    const rackSelect = document.getElementById('rackId');
    const cellSelect = document.getElementById('cellId');

    // Сбрасываем вложенные селекты
    rackSelect.innerHTML = '<option value="">— Сначала выберите зону —</option>';
    rackSelect.disabled = true;
    cellSelect.innerHTML = '<option value="">— Сначала выберите стеллаж —</option>';
    cellSelect.disabled = true;
    updateLocationPreview();

    if (!warehouseId) {
        zoneSelect.innerHTML = '<option value="">— Сначала выберите склад —</option>';
        zoneSelect.disabled = true;
        return;
    }

    zoneSelect.innerHTML = '<option value="">⏳ Загрузка...</option>';
    zoneSelect.disabled = true;

    try {
        const response = await fetch(`/api/admin/warehouses/${warehouseId}/zones`);
        const zones = await response.json();

        locations.zones = zones;

        if (zones.length === 0) {
            zoneSelect.innerHTML = '<option value="">— Нет зон —</option>';
            return;
        }

        zoneSelect.innerHTML = '<option value="">— Выберите зону —</option>' +
            zones.map(z => `<option value="${z.id}">${escapeHtml(z.name)}</option>`).join('');
        zoneSelect.disabled = false;
        updateLocationPreview();  // 🆕
    } catch (error) {
        console.error('❌ Ошибка загрузки зон:', error);
        zoneSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

/**
 * При смене зоны — загружаем стеллажи
 */
async function onZoneChange() {
    const zoneId = document.getElementById('zoneId').value;
    const rackSelect = document.getElementById('rackId');
    const cellSelect = document.getElementById('cellId');

    cellSelect.innerHTML = '<option value="">— Сначала выберите стеллаж —</option>';
    cellSelect.disabled = true;
    updateLocationPreview();

    if (!zoneId) {
        rackSelect.innerHTML = '<option value="">— Сначала выберите зону —</option>';
        rackSelect.disabled = true;
        return;
    }

    rackSelect.innerHTML = '<option value="">⏳ Загрузка...</option>';
    rackSelect.disabled = true;

    try {
        const response = await fetch(`/api/admin/zones/${zoneId}/racks`);
        const racks = await response.json();

        locations.racks = racks;

        if (racks.length === 0) {
            rackSelect.innerHTML = '<option value="">— Нет стеллажей —</option>';
            return;
        }

        rackSelect.innerHTML = '<option value="">— Выберите стеллаж —</option>' +
            racks.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
        rackSelect.disabled = false;
        updateLocationPreview();  // 🆕
    } catch (error) {
        console.error('❌ Ошибка загрузки стеллажей:', error);
        rackSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

/**
 * При смене стеллажа — загружаем ячейки
 */
async function onRackChange() {
    const rackId = document.getElementById('rackId').value;
    const cellSelect = document.getElementById('cellId');

    updateLocationPreview();

    if (!rackId) {
        cellSelect.innerHTML = '<option value="">— Сначала выберите стеллаж —</option>';
        cellSelect.disabled = true;
        return;
    }

    cellSelect.innerHTML = '<option value="">⏳ Загрузка...</option>';
    cellSelect.disabled = true;

    try {
        const response = await fetch(`/api/admin/racks/${rackId}/cells`);
        const cells = await response.json();

        locations.cells = cells;

        if (cells.length === 0) {
            cellSelect.innerHTML = '<option value="">— Нет ячеек —</option>';
            return;
        }

        cellSelect.innerHTML = '<option value="">— Выберите ячейку —</option>' +
            cells.map(c => {
                const code = c.code ? ` [${c.code}]` : '';
                const count = c.equipment_count || 0;
                const capacity = c.capacity || 0;
                const countText = capacity > 0 ? ` (${count}/${capacity})` : (count > 0 ? ` (${count})` : '');
                return `<option value="${c.id}">${escapeHtml(c.name)}${code}${countText}</option>`;
            }).join('');
        cellSelect.disabled = false;
        updateLocationPreview();  // 🆕
    } catch (error) {
        console.error('❌ Ошибка загрузки ячеек:', error);
        cellSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

/**
 * Обновить превью адреса
 */
function updateLocationPreview() {
    const warehouseId = document.getElementById('warehouseId')?.value;
    const zoneId = document.getElementById('zoneId')?.value;
    const rackId = document.getElementById('rackId')?.value;
    const cellId = document.getElementById('cellId')?.value;

    const preview = document.getElementById('locationPreview');
    const previewText = document.getElementById('locationPreviewText');

    if (!preview || !previewText) return;

    const parts = [];

    if (warehouseId) {
        const wh = locations.warehouses.find(w => String(w.id) === String(warehouseId));
        if (wh) parts.push(`🏢 ${wh.name}`);
    }
    if (zoneId) {
        const z = locations.zones.find(z => String(z.id) === String(zoneId));
        if (z) parts.push(`📍 ${z.name}`);
    }
    if (rackId) {
        const r = locations.racks.find(r => String(r.id) === String(rackId));
        if (r) parts.push(`🗄️ ${r.name}`);
    }
    if (cellId) {
        const c = locations.cells.find(c => String(c.id) === String(cellId));
        if (c) {
            const code = c.code ? ` [${c.code}]` : '';
            parts.push(`📦 ${c.name}${code}`);
        }
    }

    if (parts.length === 0) {
        preview.style.display = 'none';
    } else {
        preview.style.display = 'flex';
        previewText.textContent = parts.join(' → ');
    }
}

// ============================================================
// ЗАГРУЗКА ПРИ СТАРТЕ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Загружаем склады
    loadWarehouses();
});

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