// routes/profile.js
const fs = require('fs');
const path = require('path');
const { 
  getUserById,
  getUserActiveEquipment,
  getUserEquipmentHistory,
  getUserStats
} = require('../database/db');

/**
 * GET /profile — личный кабинет пользователя
 */
async function renderProfile(req, res) {
  try {
    const userId = req.session.userId;
    
    // Получаем данные
    const user = await getUserById(userId);
    const activeEquipment = await getUserActiveEquipment(userId);
    const history = await getUserEquipmentHistory(userId);
    const stats = await getUserStats(userId);
    
    if (!user) {
      return res.redirect('/logout');
    }
    
    // Читаем HTML
    const htmlPath = path.join(__dirname, '..', 'views', 'profile.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Подставляем данные пользователя
    html = html.replace(/\{\{user\.id\}\}/g, user.id);
    html = html.replace(/\{\{user\.username\}\}/g, user.username || '');
    html = html.replace(/\{\{user\.email\}\}/g, user.email || '');
    html = html.replace(/\{\{user\.full_name\}\}/g, user.full_name || '');
    html = html.replace(/\{\{user\.department\}\}/g, user.department || '');
    html = html.replace(/\{\{user\.phone\}\}/g, user.phone || '');
    html = html.replace(/\{\{user\.role\}\}/g, user.role);
    html = html.replace(/\{\{user\.last_login\}\}/g, user.last_login || 'никогда');
    html = html.replace(/\{\{user\.created_at\}\}/g, user.created_at || '');

    
    // Статистика
    html = html.replace(/\{\{stats\.active_equipment\}\}/g, stats.active_equipment || 0);
    html = html.replace(/\{\{stats\.total_equipment\}\}/g, stats.total_equipment || 0);
    html = html.replace(/\{\{stats\.returned_equipment\}\}/g, stats.returned_equipment || 0);

    // Роль пользователя для JS
    html = html.replace(/\{\{isAdmin\}\}/g, user.role === 'admin' ? 'true' : 'false');
    
    // Активная техника
    let activeRows = '';
    if (activeEquipment.length === 0) {
      activeRows = `
        <tr>
          <td colspan="6" class="empty-row">
            <div class="empty-state">
              <span class="emoji">📭</span>
              <p>У вас нет активной техники</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      activeEquipment.forEach(item => {
        activeRows += `
          <tr>
            <td><strong>${item.inventory_number}</strong></td>
            <td>${item.name}</td>
            <td>${item.model || '—'}</td>
            <td>${item.manufacturer || '—'}</td>
            <td>${formatDate(item.assigned_date)}</td>
            <td>${item.condition_on_assign || '—'}</td>
          </tr>
        `;
      });
    }
    html = html.replace('{{active_equipment_rows}}', activeRows);
    
    // История
    let historyRows = '';
    if (history.length === 0) {
      historyRows = `
        <tr>
          <td colspan="6" class="empty-row">
            <div class="empty-state">
              <span class="emoji">📭</span>
              <p>История пуста</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      history.forEach(item => {
        const statusBadge = item.status === 'active' 
          ? '<span class="status-badge status-assigned">Активна</span>'
          : '<span class="status-badge status-available">Возвращена</span>';
        
        historyRows += `
          <tr>
            <td><strong>${item.inventory_number}</strong></td>
            <td>${item.name}</td>
            <td>${item.model || '—'}</td>
            <td>${formatDate(item.assigned_date)}</td>
            <td>${item.returned_date ? formatDate(item.returned_date) : '—'}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
    }
    html = html.replace('{{history_rows}}', historyRows);
    
    // Роль
    const roleText = user.role === 'admin' ? 'Администратор' : 'Пользователь';
    html = html.replace(/\{\{user\.role_text\}\}/g, roleText);
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error);
    res.status(500).send('Ошибка загрузки страницы');
  }
}

/**
 * Форматирование даты
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * POST /api/profile/update — обновление профиля
 */
async function updateProfileAPI(req, res) {
  try {
    const userId = req.session.userId;
    const { email, full_name, department, phone } = req.body;
    
    // Валидация
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    
    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }
    
    // Обновляем профиль
    const { updateUserProfile } = require('../database/db');
    await updateUserProfile(userId, {
      email: email.trim(),
      full_name: (full_name || '').trim(),
      department: (department || '').trim(),
      phone: (phone || '').trim()
    });
    
    // Обновляем сессию
    req.session.fullName = full_name;
    
    // Логируем
    const { logAction } = require('../utils/logger');
    await logAction({
      req,
      action: 'profile_update',
      userId: userId,
      details: JSON.stringify({ fields: Object.keys(req.body) })
    });
    
    res.json({ 
      success: true, 
      message: 'Профиль обновлён успешно' 
    });
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ 
        error: 'Этот email уже используется другим пользователем' 
      });
    }
    
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = {
  renderProfile,
  updateProfileAPI
};