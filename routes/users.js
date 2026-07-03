const fs = require('fs');
const path = require('path');
const { getUsersWithEquipment, getStats } = require('../database/db');

async function renderUsers(req, res) {
  try {
    const users = await getUsersWithEquipment();
    const stats = await getStats();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'users.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    html = html.replace('{{total_users}}', stats.total_users || 0);
    html = html.replace('{{total_equipment}}', stats.total_equipment || 0);
    html = html.replace('{{assigned_equipment}}', stats.assigned_equipment || 0);
    html = html.replace('{{available_equipment}}', stats.available_equipment || 0);
    
    let tableRows = '';
    users.forEach(user => {
      const equipmentCount = user.equipment_count || 0;
      const equipmentList = user.equipment_list || '—';
      
      tableRows += `
        <tr>
          <td>${user.id}</td>
          <td><strong>${user.full_name || user.username}</strong></td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.department || '—'}</td>
          <td>${user.phone || '—'}</td>
          <td>
            <span class="badge ${equipmentCount > 0 ? 'badge-active' : 'badge-inactive'}">
              ${equipmentCount}
            </span>
          </td>
          <td style="font-size: 13px; color: #666; max-width: 200px; word-break: break-word;">
            ${equipmentList}
          </td>
        </tr>
      `;
    });
    html = html.replace('{{user_rows}}', tableRows);
    
    res.send(html);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).send('Ошибка при загрузке страницы пользователей');
  }
}

module.exports = renderUsers;