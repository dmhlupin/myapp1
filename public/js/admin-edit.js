// public/js/admin-edit.js
// Логика формы редактирования техники

let categories = [];

// ID для предзаполнения
const originalCellId = document.getElementById('currentCellId')?.value || '';
const originalWorkplaceId = document.getElementById('currentWorkplaceId')?.value || '';

// Кэш данных для превью
let locations = {
    warehouses: [],
    zones: [],
    racks: [],
    cells: [],
};

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
    
    // 🆕 Загружаем склады и рабочие места
    await loadWarehouses();
    await loadWorkplaces();

    // 🆕 Определяем тип расположения и предзаполняем
    if (originalWorkplaceId) {
        setLocationType('workplace');
        document.getElementById('workplaceId').value = originalWorkplaceId;
        updateLocationPreview();
    } else if (originalCellId) {
        setLocationType('warehouse');
        await preloadLocation(originalCellId);
    } else {
        setLocationType('none');
    }

    // 🆕 2.11.8.2: сохранить initial-значения для подсветки изменений.
    // ВАЖНО: после loadCategories() и loadTypesForCategory(), иначе
    // у category_id/type_id будут пустые значения.
    [
        'inventory_number', 'name', 'model', 'serial_number',
        'category_id', 'type_id', 'status'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dataset.initialValue = el.value || '';
    });
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
    
    // Проверяем ID техники
    if (!equipmentId || isNaN(equipmentId)) {
        showToast('❌ Ошибка: ID техники не указан', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    let newStatus = document.getElementById('status').value;
    const currentStatus = document.getElementById('currentStatus')?.value || '';

    // 🆕 Защита: если статус 'placed' (disabled), оставляем его как есть
    // — приходит из <select> корректно, но на всякий случай подстрахуемся
    if (newStatus === '' && currentStatus === 'placed') {
      newStatus = 'placed';
    }
    
    // Проверяем, нужно ли назначение
    if (newStatus === 'assigned') {
        const assignUserId = document.getElementById('assignUserId')?.value;
        if (!assignUserId) {
            showToast('❌ Для назначения техники выберите пользователя', 'error');
            document.getElementById('assignUserId')?.focus();
            return;
        }
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Обновление...';

    // 🆕 Тип расположения (при 'assigned' место не имеет смысла — шлём null)
    let cellId = null;
    let workplaceId = null;
    if (newStatus !== 'assigned') {
        const locationType = document.querySelector('input[name="locationType"]:checked')?.value || 'none';
        cellId = locationType === 'warehouse' ? (document.getElementById('cellId')?.value || null) : null;
        workplaceId = locationType === 'workplace' ? (document.getElementById('workplaceId')?.value || null) : null;
    }

    const formData = {
        inventory_number: document.getElementById('inventory_number').value.trim(),
        category_id: document.getElementById('category_id').value || null,
        type_id: document.getElementById('type_id').value || null,
        cell_id: cellId,
        workplace_id: workplaceId,
        name: document.getElementById('name').value.trim(),
        model: document.getElementById('model').value.trim(),
        serial_number: document.getElementById('serial_number').value.trim(),
        manufacturer: document.getElementById('manufacturer').value.trim(),
        purchase_date: document.getElementById('purchase_date').value || null,
        warranty_until: document.getElementById('warranty_until').value || null,
        status: newStatus,
        description: document.getElementById('description').value.trim(),
    };
    
    // 🆕 Если статус assigned — добавляем данные о назначении
    if (newStatus === 'assigned') {
        formData.assign_user_id = document.getElementById('assignUserId').value;
        formData.assign_condition = document.getElementById('assignCondition')?.value || 'В хорошем состоянии';
    }

    console.log('📤 Отправка данных для ID:', equipmentId);
    console.log('📦 Данные:', formData);

    try {
        const response = await fetch(`/api/admin/equipment/${equipmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        console.log('📥 Ответ сервера:', result);

        if (result.success) {
            let message = '✅ Техника успешно обновлена!';
            if (result.assignment) {
                message += ' Техника назначена пользователю.';
            } else if (result.returned) {
                message += ' Техника возвращена от пользователя.';
            }
            showToast(message, 'success');
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1500);
        } else {
            showToast('❌ ' + result.error, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Обновить';
        }
    } catch (error) {
        console.error('❌ Ошибка при обновлении:', error);
        showToast('❌ Ошибка при обновлении техники', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Обновить';
    }
}

// ============================================================
// МЕСТО ХРАНЕНИЯ (каскадные селекты)
// ============================================================

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

// ============================================================
// 🆕 РАБОЧИЕ МЕСТА (один select с optgroup офис/кабинет)
// ============================================================

async function loadWorkplaces() {
    const select = document.getElementById('workplaceId');
    if (!select) return;

    try {
        const response = await fetch('/api/admin/offices/tree');
        const offices = await response.json();

        let html = '<option value="">— Не указано —</option>';

        offices.forEach(office => {
            (office.rooms || []).forEach(room => {
                const workplaces = room.workplaces || [];
                if (workplaces.length === 0) return;

                const groupLabel = `🏛️ ${office.name} / 🚪 ${room.name}`;
                let groupHtml = '';
                workplaces.forEach(wp => {
                    const code = wp.code ? ` [${wp.code}]` : '';
                    groupHtml += `<option value="${wp.id}">🪑 ${escapeHtml(wp.name)}${code}</option>`;
                });
                html += `<optgroup label="${escapeHtml(groupLabel)}">${groupHtml}</optgroup>`;
            });
        });

        select.innerHTML = html;
        console.log(`✅ Рабочие места загружены`);
    } catch (error) {
        console.error('❌ Ошибка загрузки рабочих мест:', error);
        select.innerHTML = '<option value="">— Ошибка загрузки —</option>';
    }
}

// ============================================================
// 🆕 ПЕРЕКЛЮЧАТЕЛЬ ТИПА РАСПОЛОЖЕНИЯ
// ============================================================

function setLocationType(type) {
    const radios = document.querySelectorAll('input[name="locationType"]');
    radios.forEach(r => {
        r.checked = r.value === type;
    });
    applyLocationTypeVisibility(type);
}

function onLocationTypeChange() {
    const selected = document.querySelector('input[name="locationType"]:checked');
    if (!selected) return;

    const type = selected.value;
    applyLocationTypeVisibility(type);

    // При переключении — сбрасываем значения "другой" ветки
    if (type === 'workplace') {
        // Сбрасываем склад
        document.getElementById('warehouseId').value = '';
        document.getElementById('zoneId').innerHTML = '<option value="">— Сначала выберите склад —</option>';
        document.getElementById('zoneId').disabled = true;
        document.getElementById('rackId').innerHTML = '<option value="">— Сначала выберите зону —</option>';
        document.getElementById('rackId').disabled = true;
        document.getElementById('cellId').innerHTML = '<option value="">— Сначала выберите стеллаж —</option>';
        document.getElementById('cellId').disabled = true;
    } else if (type === 'warehouse') {
        // Сбрасываем рабочее место
        document.getElementById('workplaceId').value = '';
    } else {
        // "Не указано" — сбрасываем всё
        document.getElementById('workplaceId').value = '';
        document.getElementById('warehouseId').value = '';
        document.getElementById('zoneId').innerHTML = '<option value="">— Сначала выберите склад —</option>';
        document.getElementById('zoneId').disabled = true;
        document.getElementById('rackId').innerHTML = '<option value="">— Сначала выберите зону —</option>';
        document.getElementById('rackId').disabled = true;
        document.getElementById('cellId').innerHTML = '<option value="">— Сначала выберите стеллаж —</option>';
        document.getElementById('cellId').disabled = true;
    }

    updateLocationPreview();
}

function applyLocationTypeVisibility(type) {
    const warehouseBlock = document.getElementById('warehouseBlock');
    const workplaceBlock = document.getElementById('workplaceBlock');

    if (warehouseBlock) warehouseBlock.style.display = type === 'warehouse' ? 'block' : 'none';
    if (workplaceBlock) workplaceBlock.style.display = type === 'workplace' ? 'block' : 'none';
}

async function onWarehouseChange() {
    const warehouseId = document.getElementById('warehouseId').value;
    const zoneSelect = document.getElementById('zoneId');
    const rackSelect = document.getElementById('rackId');
    const cellSelect = document.getElementById('cellId');
    
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
        updateLocationPreview();  // 🆕 Обновляем превью после загрузки ячеек
    } catch (error) {
        console.error('❌ Ошибка загрузки зон:', error);
        zoneSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

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
        updateLocationPreview();  // 🆕 Обновляем превью после загрузки ячеек
    } catch (error) {
        console.error('❌ Ошибка загрузки стеллажей:', error);
        rackSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

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
        updateLocationPreview();  // 🆕 Обновляем превью после загрузки ячеек
    } catch (error) {
        console.error('❌ Ошибка загрузки ячеек:', error);
        cellSelect.innerHTML = '<option value="">— Ошибка —</option>';
    }
}

/**
 * Предзаполнить место хранения по cell_id
 */
async function preloadLocation(cellId) {
    try {
        // Получаем информацию о ячейке
        const cellResponse = await fetch(`/api/admin/cells/${cellId}`);
        const cell = await cellResponse.json();
        
        if (!cell || !cell.id) return;
        
        // Устанавливаем склад
        const warehouseSelect = document.getElementById('warehouseId');
        warehouseSelect.value = cell.warehouse_id;
        
        // Загружаем зоны и устанавливаем
        const zonesResponse = await fetch(`/api/admin/warehouses/${cell.warehouse_id}/zones`);
        const zones = await zonesResponse.json();
        locations.zones = zones;
        
        const zoneSelect = document.getElementById('zoneId');
        zoneSelect.innerHTML = '<option value="">— Выберите зону —</option>' +
            zones.map(z => `<option value="${z.id}">${escapeHtml(z.name)}</option>`).join('');
        zoneSelect.disabled = false;
        zoneSelect.value = cell.zone_id;
        
        // Загружаем стеллажи и устанавливаем
        const racksResponse = await fetch(`/api/admin/zones/${cell.zone_id}/racks`);
        const racks = await racksResponse.json();
        locations.racks = racks;
        
        const rackSelect = document.getElementById('rackId');
        rackSelect.innerHTML = '<option value="">— Выберите стеллаж —</option>' +
            racks.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
        rackSelect.disabled = false;
        rackSelect.value = cell.rack_id;
        
        // Загружаем ячейки и устанавливаем
        const cellsResponse = await fetch(`/api/admin/racks/${cell.rack_id}/cells`);
        const cells = await cellsResponse.json();
        locations.cells = cells;
        
        const cellSelect = document.getElementById('cellId');
        cellSelect.innerHTML = '<option value="">— Выберите ячейку —</option>' +
            cells.map(c => {
                const code = c.code ? ` [${c.code}]` : '';
                const count = c.equipment_count || 0;
                const capacity = c.capacity || 0;
                const countText = capacity > 0 ? ` (${count}/${capacity})` : (count > 0 ? ` (${count})` : '');
                return `<option value="${c.id}">${escapeHtml(c.name)}${code}${countText}</option>`;
            }).join('');
        cellSelect.disabled = false;
        cellSelect.value = cell.id;
        
        updateLocationPreview();
        
        console.log('✅ Место хранения предзаполнено');
    } catch (error) {
        console.error('❌ Ошибка предзаполнения:', error);
    }
}

function updateLocationPreview() {
    const selected = document.querySelector('input[name="locationType"]:checked');
    const type = selected ? selected.value : 'none';

    const preview = document.getElementById('locationPreview');
    const previewText = document.getElementById('locationPreviewText');
    if (!preview || !previewText) return;

    const parts = [];

    if (type === 'workplace') {
        const workplaceId = document.getElementById('workplaceId')?.value;
        if (workplaceId) {
            const opt = document.querySelector(`#workplaceId option[value="${workplaceId}"]`);
            const label = opt ? opt.textContent.trim() : `🪑 WP #${workplaceId}`;
            // Ищем optgroup-label
            const group = opt ? opt.closest('optgroup') : null;
            const groupLabel = group ? group.label : '';
            if (groupLabel) parts.push(groupLabel);
            parts.push(label);
        }
    } else if (type === 'warehouse') {
        const warehouseId = document.getElementById('warehouseId')?.value;
        const zoneId = document.getElementById('zoneId')?.value;
        const rackId = document.getElementById('rackId')?.value;
        const cellId = document.getElementById('cellId')?.value;

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
    }

    if (parts.length === 0) {
        preview.style.display = 'none';
    } else {
        preview.style.display = 'flex';
        previewText.textContent = parts.join(' → ');
    }
}


// ============================================================
// СМЕНА СТАТУСА ТЕХНИКИ
// ============================================================

/**
 * Обработка смены статуса техники
 * - assigned → available: показать предупреждение о возврате
 * - available → assigned: показать секцию назначения
 */
function onStatusChange() {
    const newStatus = document.getElementById('status').value;
    const oldStatus = document.getElementById('currentStatus')?.value || '';
    const warning = document.getElementById('statusWarning');
    const info = document.getElementById('statusInfo');
    const assignSection = document.getElementById('assignSection');
    const helpText = document.getElementById('statusHelpText');
    const locationCard = document.getElementById('locationCard');

    // Скрываем все служебные блоки
    if (warning) warning.classList.remove('show');
    if (info) info.classList.remove('show');
    if (assignSection) assignSection.classList.remove('show');

    // 🆕 Скрываем карточку «Расположение» при статусе «Назначена»
    if (locationCard) {
        locationCard.style.display = (newStatus === 'assigned') ? 'none' : '';
    }

    // 🆕 Показываем assignSection, если ТЕКУЩИЙ статус в select = 'assigned'
    // (а не только при переходе available → assigned).
    if (newStatus === 'assigned') {
        if (info) info.classList.add('show');
        if (assignSection) assignSection.classList.add('show');

        if (helpText) {
            if (oldStatus === 'assigned') {
                helpText.textContent = 'Техника уже назначена. Для переназначения выберите другого пользователя.';
            } else {
                helpText.textContent = 'ℹ️ Выберите пользователя для назначения техники';
            }
        }
    } else if (oldStatus === 'assigned' && newStatus === 'available') {
        // Возврат техники
        if (warning) warning.classList.add('show');
        if (helpText) {
            helpText.textContent = '⚠️ Техника будет автоматически возвращена от пользователя';
        }
    } else {
        if (helpText) {
            helpText.textContent = 'Выберите статус техники';
        }
    }
}

// ============================================================
// ВЫЗОВ ПРИ ЗАГРУЗКЕ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем состояние для отображения правильных блоков
    onStatusChange();
});

// ============================================================
// 2.11.8.2: Живой preview в правой колонке
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (!equipmentId || isNaN(equipmentId)) return;

  // 1) Первичная загрузка текущего расположения (назначен/склад/место)
  loadCurrentLocation();

  // 2) Живой биндинг полей формы → правая колонка
  bindLivePreview();
});

/**
 * Загрузить текущее расположение: назначен / склад / рабочее место / ничего
 */
async function loadCurrentLocation() {
  try {
    const res = await fetch(`/api/admin/equipment/${equipmentId}/details`);
    if (!res.ok) return;

    const data = await res.json();
    const cur = data.stats?.current_user;
    const loc = data.location || {};

    // Кому назначена
    const assignedEl = document.getElementById('info_assigned');
    if (assignedEl) {
      if (cur) {
        const dept = cur.department ? ` (${cur.department})` : '';
        assignedEl.textContent = `${cur.full_name}${dept}`;
        assignedEl.classList.remove('muted');
      } else {
        assignedEl.textContent = '—';
        assignedEl.classList.add('muted');
      }
    }

    // Расположение
    const locEl = document.getElementById('info_location');
    if (locEl) {
      let text = '—';
      if (loc.type === 'workplace') {
        const code = loc.workplace_code ? ` [${loc.workplace_code}]` : '';
        text = `🪑 ${loc.workplace_name}${code} — ${loc.office_name} / ${loc.room_name}`;
      } else if (loc.type === 'cell') {
        text = `📦 ${loc.cell_name} [${loc.cell_code}] — ${loc.warehouse_name} / ${loc.zone_name} / ${loc.rack_name}`;
      } else if (loc.type === 'user') {
        text = '👤 У пользователя';
      }
      locEl.textContent = text;
      locEl.classList.toggle('muted', text === '—');
    }
  } catch (err) {
    console.error('❌ Не удалось загрузить текущее расположение:', err);
  }
}

/**
 * Связать поля формы с полями правой колонки
 */
function bindLivePreview() {
  bindInput('inventory_number', 'info_inv');
  bindInput('name',             'info_name');
  bindInput('model',            'info_model');
  bindInput('serial_number',    'info_serial');

  bindSelect('category_id', 'info_category');
  bindSelect('type_id',     'info_type');
  bindSelect('status',      'info_status');
}

function bindInput(inputId, infoId) {
  const input = document.getElementById(inputId);
  const info = document.getElementById(infoId);
  if (!input || !info) return;

  input.addEventListener('input', () => {
    const v = input.value.trim();
    info.textContent = v || '—';
    info.classList.toggle('muted', !v);
    markChanged(info, inputId);
  });
}

function bindSelect(selectId, infoId) {
  const select = document.getElementById(selectId);
  const info = document.getElementById(infoId);
  if (!select || !info) return;

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    const v = opt ? opt.textContent.trim() : '';
    info.textContent = v || '—';
    info.classList.toggle('muted', !v);
    markChanged(info, selectId);
  });
}

/**
 * Подсветить поле, если значение отличается от исходного
 */
function markChanged(infoEl, fieldId) {
  // Исходное значение берём из скрытого поля current* или из начального value
  const originalMap = {
    inventory_number: '{{inventory_number}}',  // ← не сработает, шаблон уже отрендерен
  };
  // Проще: считаем, что «изменено» — если отличается от initialValue, снятого при загрузке.
  // Сохраняем initialValue в data-атрибут при DOMContentLoaded.
  const input = document.getElementById(fieldId);
  if (!input) return;

  const initial = input.dataset.initialValue ?? '';
  const current = (input.value || '').trim();
  infoEl.classList.toggle('changed', current !== initial);
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