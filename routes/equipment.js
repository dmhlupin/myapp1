// routes/equipment.js
// Страница просмотра техники (для всех авторизованных)

const fs = require('fs');
const path = require('path');
const {
  getEquipmentWithLocation,
  getStats,
  getAllCategories,
  getAllTypes,
  getAllWarehouses,
  getAllOffices,          // 🆕
  getRoomsByOffice,       // 🆕
  getWorkplacesByRoom,    // 🆕
} = require('../database/db');

/**
 * GET /equipment — страница просмотра техники
 */
async function renderEquipmentDashboard(req, res) {
  try {
    // Загружаем технику с полным адресом хранения
    const equipment = await getEquipmentWithLocation();
    const stats = await getStats();
    const categories = await getAllCategories();
    const types = await getAllTypes();
    const warehouses = await getAllWarehouses();   // 🆕
    
    const htmlPath = path.join(__dirname, '..', 'views', 'equipment.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Статистика
    html = html.replace(/\{\{total_equipment\}\}/g, stats.total_equipment || 0);
    html = html.replace(/\{\{available_equipment\}\}/g, stats.available_equipment || 0);
    html = html.replace(/\{\{assigned_equipment\}\}/g, stats.assigned_equipment || 0);
    html = html.replace(/\{\{total_users\}\}/g, stats.total_users || 0);
    
    // Селект категорий
    let categoryOptions = '<option value="">Все категории</option>';
    categories.forEach(cat => {
      categoryOptions += `<option value="${cat.id}">${cat.icon || '📁'} ${cat.name} (${cat.equipment_count || 0})</option>`;
    });
    html = html.replace('{{category_options}}', categoryOptions);

        // 🆕 Селект складов
    let warehouseOptions = '<option value="">Все склады</option>';
    warehouseOptions += '<option value="__none__">— Не на складе —</option>';
    warehouses.forEach(w => {
      warehouseOptions += `<option value="${w.id}">${w.is_default ? '⭐ ' : '🏢 '}${w.name} (${w.equipment_count || 0})</option>`;
    });
    html = html.replace('{{warehouse_options}}', warehouseOptions);

        // 🆕 Селект рабочих мест (optgroup по офис/кабинет)
    let workplaceOptions = '<option value="">Все рабочие места</option>';
    workplaceOptions += '<option value="__none__">— Не на рабочем месте —</option>';

    const offices = await getAllOffices();
    for (const office of offices) {
      const rooms = await getRoomsByOffice(office.id);
      for (const room of rooms) {
        const workplaces = await getWorkplacesByRoom(room.id);
        if (workplaces.length === 0) continue;

        const groupLabel = `🏛️ ${office.name} / 🚪 ${room.name}`;
        let groupHtml = '';
        workplaces.forEach(wp => {
          const code = wp.code ? ` [${wp.code}]` : '';
          const count = wp.equipment_count || 0;
          groupHtml += `<option value="${wp.id}">🪑 ${escapeHtml(wp.name)}${code} (${count})</option>`;
        });
        workplaceOptions += `<optgroup label="${escapeHtml(groupLabel)}">${groupHtml}</optgroup>`;
      }
    }
    html = html.replace('{{workplace_options}}', workplaceOptions);
    
    // Таблица
    let tableRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const userInfo = item.user_name 
        ? `${item.user_name} (${item.user_department || 'без отдела'})` 
        : '—';
      
      const categoryCell = item.category_name 
        ? `<span class="category-badge">${item.category_icon || '📁'} ${item.category_name}</span>`
        : '<span style="color: #a0aec0;">—</span>';
      
      const typeCell = item.type_name 
        ? `<span class="type-badge">${item.type_icon || '📦'} ${item.type_name}</span>`
        : '<span style="color: #a0aec0;">—</span>';
      
      // 🆕 Место хранения: склад ИЛИ рабочее место
      let locationCell = '<span style="color: #cbd5e0;">—</span>';
      if (item.cell_id) {
        locationCell = `<div class="location-cell">
             <div class="location-path">${item.warehouse_name} → ${item.zone_name} → ${item.rack_name}</div>
             <div class="location-cell-code">${item.cell_name}${item.cell_code ? ` [${item.cell_code}]` : ''}</div>
           </div>`;
      } else if (item.workplace_id) {
        locationCell = `<div class="location-cell">
             <div class="location-path">🪑 Рабочее место</div>
             <div class="location-cell-code" style="background: var(--success-bg); color: var(--success);">WP #${item.workplace_id}</div>
           </div>`;
      }
      
      tableRows += `
        <tr data-category-id="${item.category_id || ''}" 
            data-type-id="${item.type_id || ''}" 
            data-warehouse-id="${item.warehouse_id || ''}"
            data-workplace-id="${item.workplace_id || ''}"
            onclick="viewEquipmentFromList(${item.id})"
            style="cursor: pointer;"
            title="Нажмите для просмотра">
          <td><strong>${item.inventory_number}</strong></td>
          <td>${item.name}</td>
          <td>${item.model || '—'}</td>
          <td>${categoryCell}</td>
          <td>${typeCell}</td>
          <td>${locationCell}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>${userInfo}</td>
        </tr>
      `;
    });
    html = html.replace('{{equipment_rows}}', tableRows);
    
    // JSON типов (экранированный)
    html = html.replace('{{{types_json}}}', escapeHtml(JSON.stringify(types)));
    
    // Собираем страницу через layout-контроллер
    const { renderPage } = require('../utils/layout');
    
    const fullHtml = renderPage({
        title: 'Учет техники — MoveIT service',
        content: html,
        pageCss: '/css/equipment.css',
        pageJs: '/js/equipment-filter.js',
    });
    
    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).send('Ошибка при загрузке данных');
  }
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

module.exports = renderEquipmentDashboard;