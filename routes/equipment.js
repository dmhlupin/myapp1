// routes/equipment.js
// Страница просмотра техники (для всех авторизованных)

const fs = require('fs');
const path = require('path');
const {
  getEquipmentWithUsers,
  getStats,
  getAllCategories,
  getAllTypes,
} = require('../database/db');

/**
 * GET /equipment — страница просмотра техники
 */
async function renderEquipmentDashboard(req, res) {
  try {
    const equipment = await getEquipmentWithUsers();
    const stats = await getStats();
    const categories = await getAllCategories();
    const types = await getAllTypes();
    
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
    
    // Таблица
    let tableRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const userInfo = item.user_name ? `${item.user_name} (${item.user_department || 'без отдела'})` : '—';
      
      const categoryCell = item.category_name 
        ? `<span class="category-badge">${item.category_icon || '📁'} ${item.category_name}</span>`
        : '<span style="color: #a0aec0;">—</span>';
      
      const typeCell = item.type_name 
        ? `<span class="type-badge">${item.type_icon || '📦'} ${item.type_name}</span>`
        : '<span style="color: #a0aec0;">—</span>';
      
      tableRows += `
        <tr data-category-id="${item.category_id || ''}" data-type-id="${item.type_id || ''}">
          <td><strong>${item.inventory_number}</strong></td>
          <td>${item.name}</td>
          <td>${item.model || '—'}</td>
          <td>${categoryCell}</td>
          <td>${typeCell}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>${userInfo}</td>
        </tr>
      `;
    });
    html = html.replace('{{equipment_rows}}', tableRows);
    
    // JSON типов (экранированный)
    html = html.replace('{{{types_json}}}', escapeHtml(JSON.stringify(types)));
    
    res.send(html);
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