// public/js/catalog.js
// Логика страницы справочника техники

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let categories = [];
let types = [];
let currentFilter = ''; // ID категории для фильтрации типов
let deleteTarget = null; // { type: 'category'|'type', id, name }

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📚 Справочник: загрузка данных...');
    await loadAll();
});

/**
 * Загрузить категории и типы
 */
async function loadAll() {
    try {
        const [cats, typs] = await Promise.all([
            fetch('/api/admin/categories').then(r => r.json()),
            fetch('/api/admin/types').then(r => r.json()),
        ]);
        
        categories = Array.isArray(cats) ? cats : [];
        types = Array.isArray(typs) ? typs : [];
        
        console.log(`✅ Загружено: ${categories.length} категорий, ${types.length} типов`);
        
        renderCategories();
        renderTypes();
        updateStats();
        updateCategoryFilter();
        updateCategorySelectInTypeModal();
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showToast('❌ Ошибка загрузки данных', 'error');
    }
}

// ============================================================
// ОТРИСОВКА КАТЕГОРИЙ
// ============================================================

function renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="catalog-empty">
                <span class="empty-icon">📭</span>
                <div class="empty-text">Нет категорий</div>
                <div class="empty-hint">Нажмите "➕ Добавить" чтобы создать первую</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-item ${String(cat.id) === String(currentFilter) ? 'selected' : ''}" 
             data-id="${cat.id}"
             onclick="selectCategory(${cat.id})">
            <div class="category-icon">${cat.icon || '📁'}</div>
            <div class="category-info">
                <div class="category-name">${escapeHtml(cat.name)}</div>
                ${cat.description ? `<div class="category-description">${escapeHtml(cat.description)}</div>` : ''}
                <div class="category-stats">
                    <span>📦 ${cat.types_count || 0} типов</span>
                    <span>🔧 ${cat.equipment_count || 0} техники</span>
                </div>
            </div>
            <div class="category-actions" onclick="event.stopPropagation()">
                <button onclick="openCategoryModal(${cat.id})" 
                        class="btn-action btn-edit" 
                        title="Редактировать">✏️</button>
                <button onclick="deleteCategoryItem(${cat.id}, '${escapeAttr(cat.name)}')" 
                        class="btn-action btn-delete" 
                        title="Удалить">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// ОТРИСОВКА ТИПОВ
// ============================================================

function renderTypes() {
    const container = document.getElementById('typesList');
    
    // Фильтрация
    const filtered = currentFilter
        ? types.filter(t => String(t.category_id) === String(currentFilter))
        : types;
    
    if (filtered.length === 0) {
        const hint = currentFilter
            ? 'В этой категории нет типов'
            : 'Нажмите "➕ Добавить" чтобы создать первый';
        
        container.innerHTML = `
            <div class="catalog-empty">
                <span class="empty-icon">📭</span>
                <div class="empty-text">Нет типов</div>
                <div class="empty-hint">${hint}</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(type => `
        <div class="type-item" data-id="${type.id}">
            <div class="type-icon">${type.icon || '📦'}</div>
            <div class="type-info">
                <div class="type-name">${escapeHtml(type.name)}</div>
                <span class="type-category">${type.category_icon || '📁'} ${escapeHtml(type.category_name)}</span>
                <div class="type-stats">🔧 ${type.equipment_count || 0} техники</div>
            </div>
            <div class="type-actions">
                <button onclick="openTypeModal(${type.id})" 
                        class="btn-action btn-edit" 
                        title="Редактировать">✏️</button>
                <button onclick="deleteTypeItem(${type.id}, '${escapeAttr(type.name)}')" 
                        class="btn-action btn-delete" 
                        title="Удалить">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// ФИЛЬТР И ВЫБОР КАТЕГОРИИ
// ============================================================

/**
 * Обновить выпадающий список категорий в фильтре
 */
function updateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    const currentValue = filter.value;
    
    filter.innerHTML = '<option value="">Все категории</option>' +
        categories.map(cat => `
            <option value="${cat.id}">${cat.icon || '📁'} ${escapeHtml(cat.name)}</option>
        `).join('');
    
    filter.value = currentValue;
}

/**
 * Обновить выпадающий список категорий в модалке типа
 */
function updateCategorySelectInTypeModal() {
    const select = document.getElementById('typeCategory');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">— Выберите категорию —</option>' +
        categories.map(cat => `
            <option value="${cat.id}">${cat.icon || '📁'} ${escapeHtml(cat.name)}</option>
        `).join('');
    
    if (currentValue) select.value = currentValue;
}

/**
 * Обработка изменения фильтра
 */
function filterTypes() {
    const filter = document.getElementById('categoryFilter');
    currentFilter = filter.value;
    renderCategories(); // для подсветки selected
    renderTypes();
}

/**
 * Клик по категории — устанавливает фильтр
 */
function selectCategory(id) {
    const filter = document.getElementById('categoryFilter');
    if (String(filter.value) === String(id)) {
        // Повторный клик — сбросить фильтр
        filter.value = '';
        currentFilter = '';
    } else {
        filter.value = id;
        currentFilter = String(id);
    }
    renderCategories();
    renderTypes();
}

// ============================================================
// СТАТИСТИКА
// ============================================================

function updateStats() {
    const statCategories = document.getElementById('statCategories');
    const statTypes = document.getElementById('statTypes');
    const statEquipment = document.getElementById('statEquipment');
    
    if (statCategories) statCategories.textContent = categories.length;
    if (statTypes) statTypes.textContent = types.length;
    if (statEquipment) {
        const total = types.reduce((sum, t) => sum + (t.equipment_count || 0), 0);
        statEquipment.textContent = total;
    }
}

// ============================================================
// МОДАЛЬНОЕ ОКНО: КАТЕГОРИЯ
// ============================================================

function openCategoryModal(id = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    form.reset();
    
    if (id) {
        // Редактирование
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        
        title.textContent = '✏️ Редактировать категорию';
        document.getElementById('categoryId').value = cat.id;
        document.getElementById('categoryIcon').value = cat.icon || '';
        document.getElementById('categoryName').value = cat.name || '';
        document.getElementById('categoryDescription').value = cat.description || '';
    } else {
        // Создание
        title.textContent = '➕ Добавить категорию';
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryIcon').value = '';
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDescription').value = '';
    }
    
    modal.classList.add('active');
    setTimeout(() => document.getElementById('categoryName').focus(), 100);
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

async function saveCategory(event) {
    event.preventDefault();
    
    const btn = document.getElementById('categorySaveBtn');
    const id = document.getElementById('categoryId').value;
    const isEdit = !!id;
    
    const data = {
        name: document.getElementById('categoryName').value.trim(),
        icon: document.getElementById('categoryIcon').value.trim(),
        description: document.getElementById('categoryDescription').value.trim(),
    };
    
    if (!data.name) {
        showToast('❌ Название обязательно', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';
    
    try {
        const url = isEdit ? `/api/admin/categories/${id}` : '/api/admin/categories';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Категория ${isEdit ? 'обновлена' : 'создана'}`, 'success');
            closeCategoryModal();
            await loadAll();
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
// МОДАЛЬНОЕ ОКНО: ТИП
// ============================================================

function openTypeModal(id = null) {
    const modal = document.getElementById('typeModal');
    const title = document.getElementById('typeModalTitle');
    const form = document.getElementById('typeForm');
    
    form.reset();
    updateCategorySelectInTypeModal();
    
    if (id) {
        // Редактирование
        const type = types.find(t => t.id === id);
        if (!type) return;
        
        title.textContent = '✏️ Редактировать тип';
        document.getElementById('typeId').value = type.id;
        document.getElementById('typeCategory').value = type.category_id;
        document.getElementById('typeIcon').value = type.icon || '';
        document.getElementById('typeName').value = type.name || '';
        document.getElementById('typeDescription').value = type.description || '';
    } else {
        // Создание
        title.textContent = '➕ Добавить тип';
        document.getElementById('typeId').value = '';
        // Если фильтр активен — предзаполняем категорию
        if (currentFilter) {
            document.getElementById('typeCategory').value = currentFilter;
        }
        document.getElementById('typeIcon').value = '';
        document.getElementById('typeName').value = '';
        document.getElementById('typeDescription').value = '';
    }
    
    modal.classList.add('active');
    setTimeout(() => document.getElementById('typeName').focus(), 100);
}

function closeTypeModal() {
    document.getElementById('typeModal').classList.remove('active');
}

async function saveType(event) {
    event.preventDefault();
    
    const btn = document.getElementById('typeSaveBtn');
    const id = document.getElementById('typeId').value;
    const isEdit = !!id;
    
    const data = {
        category_id: document.getElementById('typeCategory').value,
        name: document.getElementById('typeName').value.trim(),
        icon: document.getElementById('typeIcon').value.trim(),
        description: document.getElementById('typeDescription').value.trim(),
    };
    
    if (!data.category_id) {
        showToast('❌ Выберите категорию', 'error');
        return;
    }
    if (!data.name) {
        showToast('❌ Название обязательно', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Сохранение...';
    
    try {
        const url = isEdit ? `/api/admin/types/${id}` : '/api/admin/types';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Тип ${isEdit ? 'обновлён' : 'создан'}`, 'success');
            closeTypeModal();
            await loadAll();
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
// УДАЛЕНИЕ
// ============================================================

function deleteCategoryItem(id, name) {
    deleteTarget = { type: 'category', id, name };
    const msg = document.getElementById('deleteMessage');
    msg.innerHTML = `Вы уверены, что хотите удалить категорию <strong>"${escapeHtml(name)}"</strong>?<br><br>
        <span style="color: #c05621; font-size: 13px;">⚠️ Если в категории есть типы — удаление невозможно.</span>`;
    document.getElementById('deleteModal').classList.add('active');
}

function deleteTypeItem(id, name) {
    deleteTarget = { type: 'type', id, name };
    const msg = document.getElementById('deleteMessage');
    msg.innerHTML = `Вы уверены, что хотите удалить тип <strong>"${escapeHtml(name)}"</strong>?<br><br>
        <span style="color: #c05621; font-size: 13px;">⚠️ Если к типу привязана техника — удаление невозможно.</span>`;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTarget = null;
}

async function confirmDelete() {
    if (!deleteTarget) return;
    
    const { type, id } = deleteTarget;
    const url = type === 'category' 
        ? `/api/admin/categories/${id}` 
        : `/api/admin/types/${id}`;
    
    try {
        const response = await fetch(url, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ ${type === 'category' ? 'Категория' : 'Тип'} удалён`, 'success');
            closeDeleteModal();
            await loadAll();
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

/**
 * Экранирование HTML (для безопасной вставки)
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
 * Экранирование для атрибута onclick
 */
function escapeAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛОК ПО ESC И КЛИКУ НА ОВЕРЛЕЙ
// ============================================================

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'categoryModal') closeCategoryModal();
        if (e.target.id === 'typeModal') closeTypeModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCategoryModal();
        closeTypeModal();
        closeDeleteModal();
    }
});