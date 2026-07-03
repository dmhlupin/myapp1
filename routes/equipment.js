const fs = require('fs');
const path = require('path');
const { getEquipmentWithUsers, getStats } = require('../database/db');

async function renderEquipmentDashboard(req, res) {
  try {
    const equipment = await getEquipmentWithUsers();
    const stats = await getStats();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'equipment.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    html = html.replace('{{total_equipment}}', stats.total_equipment || 0);
    html = html.replace('{{available_equipment}}', stats.available_equipment || 0);
    html = html.replace('{{assigned_equipment}}', stats.assigned_equipment || 0);
    html = html.replace('{{total_users}}', stats.total_users || 0);
    
    let tableRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const userInfo = item.user_name ? `${item.user_name} (${item.user_department || 'без отдела'})` : '—';
      
      tableRows += `
        <tr>
          <td><strong>${item.inventory_number}</strong></td>
          <td>${item.name}</td>
          <td>${item.model || '—'}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>${userInfo}</td>
        </tr>
      `;
    });
    html = html.replace('{{equipment_rows}}', tableRows);
    
    res.send(html);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).send('Ошибка при загрузке данных');
  }
}

module.exports = renderEquipmentDashboard;