const fs = require('fs');
const path = require('path');

const {
  // Equipment
  getAllEquipment,
  getEquipmentById,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  getAvailableEquipment,
  // Assignment ← ДОБАВЬТЕ ЭТИ
  assignEquipment,
  returnEquipmentByEquipmentId,
  // Stats
  getStats,
  // Users
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  getUsersWithEquipment,
  // Admin users
  createUserWithPassword,
  getUserWithDetails,
  getAllUsersWithDetails,
  checkUserExists,
  deleteUserWithEquipmentReturn,
  getUsersWithActiveEquipment,
  // Auth
  getUserByUsernameWithPassword,
  updateUserPassword,
  setUserActive,
  setUserRole,
  // Logs
  getActivityLogs,
  getActivityLogsCount,
  getUniqueActions,
  getActivityStats,
  getActivityByDay,
  cleanOldLogs
} = require('../database/db');

// Утилиты
const { 
  hashPassword, 
  generateTempPassword,
  validateUsername,
  validateEmail,
  validatePassword
} = require('../utils/auth');

const { logAction } = require('../utils/logger');

// ===== СТРАНИЦЫ =====

async function renderAdmin(req, res) {
  try {
    const stats = await getStats();
    const equipment = await getAllEquipment();
    const users = await getAllUsersWithDetails();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Статистика
    html = html.replace('{{total_equipment}}', stats.total_equipment || 0);
    html = html.replace('{{available_equipment}}', stats.available_equipment || 0);
    html = html.replace('{{assigned_equipment}}', stats.assigned_equipment || 0);
    html = html.replace('{{total_users}}', stats.total_users || 0);
    
    // Таблица техники
    let equipmentRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const deleteButton = item.status === 'available' 
        ? `<button onclick="deleteEquipment(${item.id})" class="btn-delete" title="Удалить">🗑️</button>` 
        : '';
      
      equipmentRows += `
        <tr>
          <td>${item.id}</td>
          <td><strong>${item.inventory_number}</strong></td>
          <td>${item.name}</td>
          <td>${item.model || '—'}</td>
          <td>${item.manufacturer || '—'}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>
            <div class="action-buttons">
              <button onclick="editEquipment(${item.id})" class="btn-edit" title="Редактировать">✏️</button>
              ${deleteButton}
            </div>
          </td>
        </tr>
      `;
    });
    html = html.replace('{{equipment_rows}}', equipmentRows);
    
// Таблица пользователей
let userRows = '';
users.forEach(user => {
    const equipmentCount = user.active_equipment_count || 0;
    const hasEquipment = equipmentCount > 0;
    const isActive = user.is_active === 1;
    const isAdmin = user.role === 'admin';
    
    // Роль
    const roleBadge = isAdmin
        ? '<span class="role-badge role-admin">👑 Админ</span>'
        : '<span class="role-badge role-user">👤 Пользователь</span>';
    
    // Статус + последний вход
    const lastLogin = user.last_login 
        ? formatDate(user.last_login) 
        : 'никогда';
    
    const statusHtml = isActive
        ? `<span class="status-dot status-dot-active"></span> Активен`
        : `<span class="status-dot status-dot-blocked"></span> Заблокирован`;
    
    // Кнопки блокировки
    const blockButton = isActive
        ? `<button onclick="blockUser(${user.id})" class="btn-icon btn-warning" title="Заблокировать">🚫</button>`
        : `<button onclick="unblockUser(${user.id})" class="btn-icon btn-success" title="Разблокировать">✅</button>`;
    
    userRows += `
        <tr class="${!isActive ? 'row-blocked' : ''}">
            <td>
                <div class="user-cell">
                    <span class="user-avatar">${getInitials(user.full_name || user.username)}</span>
                    <div>
                        <div class="user-name">${user.full_name || user.username}</div>
                        <div class="user-username">@${user.username}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="contact-cell">
                    <div class="contact-email">${user.email}</div>
                    <div class="contact-dept">${user.department || 'Без отдела'}</div>
                </div>
            </td>
            <td>${roleBadge}</td>
            <td style="text-align: center;">
                <span class="badge ${hasEquipment ? 'badge-active' : 'badge-inactive'}">${equipmentCount}</span>
            </td>
            <td>
                <div class="activity-cell">
                    <div class="activity-status">${statusHtml}</div>
                    <div class="activity-login" title="Последний вход">${lastLogin}</div>
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewUser(${user.id})" class="btn-icon btn-info" title="Просмотр">👁️</button>
                    <button onclick="editUser(${user.id})" class="btn-icon btn-edit" title="Редактировать">✏️</button>
                    <button onclick="resetUserPassword(${user.id}, '${user.username}')" class="btn-icon btn-warning" title="Сбросить пароль">🔑</button>
                    ${blockButton}
                    <button onclick="deleteUser(${user.id}, '${(user.full_name || user.username).replace(/'/g, "\\'")}')" class="btn-icon btn-delete" title="Удалить">🗑️</button>
                </div>
            </td>
        </tr>
    `;
});
html = html.replace('{{user_rows}}', userRows);
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).send('Ошибка при загрузке админ-панели');
  }
}

/**
 * Получить инициалы для аватара
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ').filter(p => p);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Форматирование даты
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// ===== API ДЛЯ ТЕХНИКИ =====

async function getEquipmentAPI(req, res) {
  try {
    const equipment = await getAllEquipment();
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getEquipmentByIdAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const equipment = await getEquipmentById(id);
    if (!equipment) {
      return res.status(404).json({ error: 'Техника не найдена' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function addEquipmentAPI(req, res) {
  try {
    const { 
      inventory_number, name, model, serial_number, 
      manufacturer, purchase_date, warranty_until, 
      status, description 
    } = req.body;
    
    if (!inventory_number || !name) {
      return res.status(400).json({ 
        error: 'Инвентарный номер и название обязательны' 
      });
    }
    
    const result = await addEquipment({
      inventory_number,
      name,
      model: model || '',
      serial_number: serial_number || '',
      manufacturer: manufacturer || '',
      purchase_date: purchase_date || null,
      warranty_until: warranty_until || null,
      status: status || 'available',
      description: description || ''
    });

    const { logAction } = require('../utils/logger');
    await logAction({
        req,
        action: 'equipment_create',
        entityType: 'equipment',
        entityId: result.id,
        details: JSON.stringify({ 
          inventory_number: inventory_number,
          name: name 
        })
    });
    
    res.json({ 
      success: true, 
      message: 'Техника добавлена успешно',
      data: result 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ 
        error: 'Техника с таким инвентарным номером уже существует' 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

async function updateEquipmentAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { 
      inventory_number, name, model, serial_number, 
      manufacturer, purchase_date, warranty_until, 
      status, description, assign_user_id, assign_condition 
    } = req.body;
    
    console.log(`📥 Получен запрос на обновление техники ID: ${id}`);
    console.log('📦 Данные:', req.body);
    
    if (!inventory_number || !name) {
      return res.status(400).json({ 
        error: 'Инвентарный номер и название обязательны' 
      });
    }
    
    // Получаем текущую технику
    const existing = await getEquipmentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Техника не найдена' });
    }
    
    const oldStatus = existing.status;
    
    // 🆕 Переменная для результата назначения
    let assignmentResult = null;
    
    // 🆕 Если назначаем технику пользователю
    if (status === 'assigned' && assign_user_id) {
      
      // Если техника уже была назначена — закрываем старое назначение
      if (oldStatus === 'assigned') {
        const { db } = require('../database/db');
        
        const oldAssignment = await new Promise((resolve, reject) => {
          db.get(
            `SELECT id, user_id FROM user_equipment 
             WHERE equipment_id = ? AND returned_date IS NULL`,
            [id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        // Если назначение на ДРУГОГО пользователя — закрываем старое
        if (oldAssignment && oldAssignment.user_id !== parseInt(assign_user_id)) {
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE user_equipment 
               SET returned_date = CURRENT_TIMESTAMP, 
                   condition_on_return = 'Автовозврат: переназначение другому пользователю',
                   notes = COALESCE(notes, '') || ' | Возврат при переназначении'
               WHERE id = ?`,
              [oldAssignment.id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          console.log(`✅ Закрыто старое назначение техники ${id}`);
        }
        
        // Временно меняем статус на available, чтобы assignEquipment сработала
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE equipment SET status = "available" WHERE id = ?',
            [id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      
      // Назначаем новому пользователю
      try {
        assignmentResult = await assignEquipment(
          parseInt(assign_user_id),
          id,
          assign_condition || 'В хорошем состоянии',
          'Назначено через редактирование техники'
        );
        console.log(`✅ Техника ${id} назначена пользователю ${assign_user_id}`);
        
        // Логируем назначение
        await logAction({
          req,
          action: 'equipment_assign',
          entityType: 'equipment',
          entityId: id,
          details: JSON.stringify({ 
            inventory_number: existing.inventory_number,
            user_id: assign_user_id 
          })
        });
      } catch (error) {
        console.error('❌ Ошибка назначения:', error);
        return res.status(400).json({ error: error.message });
      }
    }
    
    // Если статус меняется с assigned на available — возвращаем технику
    if (oldStatus === 'assigned' && status === 'available') {
      const { returnEquipmentByEquipmentId } = require('../database/db');
      try {
        const returnResult = await returnEquipmentByEquipmentId(
          id, 
          'Возвращена при изменении статуса', 
          'Автоматический возврат'
        );
        console.log(`✅ Техника ${id} возвращена`);
        
        // Логируем возврат
        await logAction({
          req,
          action: 'equipment_return',
          entityType: 'equipment',
          entityId: id,
          details: JSON.stringify({ 
            inventory_number: existing.inventory_number 
          })
        });
      } catch (error) {
        console.warn('⚠️ Не удалось автоматически вернуть технику:', error.message);
      }
    }
    
    // Обновляем технику
    const result = await updateEquipment(id, {
      inventory_number,
      name,
      model: model || '',
      serial_number: serial_number || '',
      manufacturer: manufacturer || '',
      purchase_date: purchase_date || null,
      warranty_until: warranty_until || null,
      status: status || 'available',
      description: description || ''
    });
    
    // Логируем обновление
    await logAction({
      req,
      action: 'equipment_update',
      entityType: 'equipment',
      entityId: id,
      details: JSON.stringify({ 
        inventory_number: inventory_number,
        status_changed: oldStatus !== status 
      })
    });
    
    res.json({ 
      success: true, 
      message: 'Техника обновлена успешно',
      data: result,
      assignment: assignmentResult    // ← теперь переменная объявлена (была необъявлена)
    });

  } catch (error) {
    console.error('❌ Ошибка обновления:', error);
    if (error.message === 'Техника не найдена') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

async function deleteEquipmentAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const result = await deleteEquipment(id);
    
    if (result.deleted === 0) {
      return res.status(404).json({ error: 'Техника не найдена' });
    }
    
    const { logAction } = require('../utils/logger');
    await logAction({
        req,
        action: 'equipment_delete',
        entityType: 'equipment',
        entityId: result.id,
        details: JSON.stringify({ 
          inventory_number: inventory_number,
          name: name 
        })
    });
    
    res.json({ 
      success: true, 
      message: 'Техника удалена успешно' 
    });
  } catch (error) {
    if (error.message.includes('назначена пользователю')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// ===== СТРАНИЦЫ ДЛЯ ТЕХНИКИ =====

function renderAddEquipment(req, res) {
  const htmlPath = path.join(__dirname, '..', 'views', 'admin-add.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Ошибка загрузки страницы');
      return;
    }
    res.send(html);
  });
}

async function renderEditEquipment(req, res) {
  try {
    const id = parseInt(req.params.id);
    console.log(`📝 Редактирование техники ID: ${id}`);
    
    if (isNaN(id)) {
      return res.status(400).send('Неверный ID');
    }
    
    const equipment = await getEquipmentById(id);
    const users = await getAllUsers();
    
    if (!equipment) {
      return res.status(404).send('Техника не найдена');
    }
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-edit.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Заменяем все переменные
    html = html.replace(/\{\{id\}\}/g, equipment.id);
    html = html.replace(/\{\{inventory_number\}\}/g, equipment.inventory_number || '');
    html = html.replace(/\{\{name\}\}/g, equipment.name || '');
    html = html.replace(/\{\{model\}\}/g, equipment.model || '');
    html = html.replace(/\{\{serial_number\}\}/g, equipment.serial_number || '');
    html = html.replace(/\{\{manufacturer\}\}/g, equipment.manufacturer || '');
    html = html.replace(/\{\{purchase_date\}\}/g, equipment.purchase_date || '');
    html = html.replace(/\{\{warranty_until\}\}/g, equipment.warranty_until || '');
    html = html.replace(/\{\{status\}\}/g, equipment.status || 'available');
    html = html.replace(/\{\{description\}\}/g, equipment.description || '');
    
    // Статусы
    const statuses = ['available', 'assigned', 'maintenance', 'retired'];
    let statusOptions = '';
    statuses.forEach(s => {
      const selected = s === equipment.status ? 'selected' : '';
      statusOptions += `<option value="${s}" ${selected}>${s}</option>`;
    });
    html = html.replace(/\{\{status_options\}\}/g, statusOptions);
    
    // Пользователи для выбора при назначении
    let userOptions = '<option value="">-- Выберите пользователя --</option>';
    users.forEach(user => {
      const fullName = user.full_name || user.username;
      userOptions += `<option value="${user.id}">${fullName} (${user.department || 'без отдела'})</option>`;
    });
    html = html.replace(/\{\{user_options\}\}/g, userOptions);
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка при загрузке страницы редактирования:', error);
    res.status(500).send('Ошибка при загрузке страницы');
  }
}
// ===== API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====

async function getUsersAPI(req, res) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserByIdAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/users — создание пользователя с автогенерацией пароля
 */
async function addUserAPI(req, res) {
  try {
    const { username, email, full_name, department, phone, role } = req.body;
    
    // Валидация
    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Логин и email обязательны' 
      });
    }
    
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return res.status(400).json({ error: usernameCheck.errors.join('. ') });
    }
    
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.errors.join('. ') });
    }
    
    // Проверяем, что пользователя нет
    const existing = await checkUserExists(username.trim(), email.trim());
    if (existing) {
      if (existing.username === username.trim()) {
        return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
      }
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Валидация роли
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';
    
    // Генерируем временный пароль
    const tempPassword = generateTempPassword(12);
    const passwordHash = await hashPassword(tempPassword);
    
    // Создаём пользователя
    const result = await createUserWithPassword({
      username: username.trim(),
      email: email.trim(),
      full_name: (full_name || '').trim(),
      department: (department || '').trim(),
      phone: (phone || '').trim(),
      password_hash: passwordHash,
      role: userRole,
      must_change_password: 1
    });
    
    // Логируем
    await logAction({
      req,
      action: 'user_create',
      entityType: 'user',
      entityId: result.id,
      details: JSON.stringify({ 
        username: username.trim(), 
        role: userRole 
      })
    });
    
    // Возвращаем сгенерированный пароль ОДИН РАЗ
    res.json({ 
      success: true, 
      message: 'Пользователь создан успешно',
      data: {
        id: result.id,
        username: username.trim(),
        email: email.trim(),
        full_name: full_name,
        role: userRole
      },
      // ⚠️ Пароль показывается ТОЛЬКО ОДИН РАЗ!
      tempPassword: tempPassword,
      warning: 'Сохраните пароль! Он больше не будет показан.'
    });
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/users/:id/reset-password — сброс пароля
 */
async function resetUserPasswordAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Генерируем новый временный пароль
    const tempPassword = generateTempPassword(12);
    const passwordHash = await hashPassword(tempPassword);
    
    // Обновляем пароль, устанавливаем must_change_password=1
    const { updateUserPassword } = require('../database/db');
    await updateUserPassword(id, passwordHash, 1);
    
    // Логируем
    await logAction({
      req,
      action: 'user_password_reset',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ username: user.username })
    });
    
    res.json({ 
      success: true, 
      message: `Пароль пользователя "${user.full_name || user.username}" сброшен`,
      tempPassword: tempPassword,
      warning: 'Передайте пароль пользователю. Он должен сменить его при следующем входе.'
    });
  } catch (error) {
    console.error('❌ Ошибка сброса пароля:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/users/:id/block — блокировка
 */
async function blockUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    // Нельзя заблокировать себя
    if (id === req.session.userId) {
      return res.status(400).json({ error: 'Нельзя заблокировать себя' });
    }
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Нельзя заблокировать последнего админа
    if (user.role === 'admin') {
      const { db } = require('../database/db');
      const adminCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Нельзя заблокировать последнего активного администратора' 
        });
      }
    }
    
    const { setUserActive } = require('../database/db');
    await setUserActive(id, false);
    
    await logAction({
      req,
      action: 'user_block',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ username: user.username })
    });
    
    res.json({ 
      success: true, 
      message: `Пользователь "${user.full_name || user.username}" заблокирован`
    });
  } catch (error) {
    console.error('❌ Ошибка блокировки:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/users/:id/unblock — разблокировка
 */
async function unblockUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const { setUserActive } = require('../database/db');
    await setUserActive(id, true);
    
    await logAction({
      req,
      action: 'user_unblock',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ username: user.username })
    });
    
    res.json({ 
      success: true, 
      message: `Пользователь "${user.full_name || user.username}" разблокирован`
    });
  } catch (error) {
    console.error('❌ Ошибка разблокировки:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/users/:id/details — детали пользователя
 */
async function getUserDetailsAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserWithDetails(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Получаем активную технику
    const { getUserActiveEquipment, getUserEquipmentHistory } = require('../database/db');
    const activeEquipment = await getUserActiveEquipment(id);
    const history = await getUserEquipmentHistory(id);
    
    // Убираем пароль из ответа
    delete user.password_hash;
    
    res.json({
      user,
      activeEquipment,
      history: history.slice(0, 20) // последние 20
    });
  } catch (error) {
    console.error('❌ Ошибка получения деталей:', error);
    res.status(500).json({ error: error.message });
  }
}

async function updateUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { username, email, full_name, department, phone, role } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Логин и email обязательны' 
      });
    }
    
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return res.status(400).json({ error: usernameCheck.errors.join('. ') });
    }
    
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.errors.join('. ') });
    }
    
    // Проверяем, что нет другого пользователя с таким логином/email
    const existing = await checkUserExists(username.trim(), email.trim(), id);
    if (existing) {
      if (existing.username === username.trim()) {
        return res.status(400).json({ error: 'Логин уже используется' });
      }
      return res.status(400).json({ error: 'Email уже используется' });
    }
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Проверяем смену роли
    const newRole = ['admin', 'user'].includes(role) ? role : user.role;
    
    // Если меняем админа на пользователя — проверяем, что это не последний админ
    if (user.role === 'admin' && newRole === 'user') {
      const { db } = require('../database/db');
      const adminCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Нельзя изменить роль последнего администратора' 
        });
      }
    }
    
    // Обновляем
    const { db } = require('../database/db');
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users 
         SET username = ?, email = ?, full_name = ?, department = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [username.trim(), email.trim(), full_name || '', department || '', phone || '', newRole, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
    
    // Логируем
    await logAction({
      req,
      action: 'user_update',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ 
        username: username.trim(),
        role_changed: user.role !== newRole
      })
    });
    
    res.json({ 
      success: true, 
      message: 'Пользователь обновлён успешно'
    });
  } catch (error) {
    console.error('❌ Ошибка обновления:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/admin/users/:id — удаление с возвратом техники
 */
async function deleteUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    // Нельзя удалить себя
    if (id === req.session.userId) {
      return res.status(400).json({ error: 'Нельзя удалить себя' });
    }
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Нельзя удалить последнего админа
    if (user.role === 'admin') {
      const { db } = require('../database/db');
      const adminCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Нельзя удалить последнего активного администратора' 
        });
      }
    }
    
    // Удаляем с возвратом техники
    const result = await deleteUserWithEquipmentReturn(id);
    
    // Логируем
    await logAction({
      req,
      action: 'user_delete',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ 
        username: user.username,
        equipment_returned: result.equipment_returned 
      })
    });
    
    res.json({ 
      success: true, 
      message: `Пользователь удалён. Возвращено техники: ${result.equipment_returned}`,
      data: result
    });
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    res.status(500).json({ error: error.message });
  }
}

// ===== СТРАНИЦЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====

function renderAddUser(req, res) {
  const htmlPath = path.join(__dirname, '..', 'views', 'admin-user-add.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Ошибка загрузки страницы');
      return;
    }
    res.send(html);
  });
}

async function renderEditUser(req, res) {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-user-edit.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    html = html.replace(/\{\{id\}\}/g, user.id);
    html = html.replace(/\{\{username\}\}/g, user.username || '');
    html = html.replace(/\{\{email\}\}/g, user.email || '');
    html = html.replace(/\{\{full_name\}\}/g, user.full_name || '');
    html = html.replace(/\{\{department\}\}/g, user.department || '');
    html = html.replace(/\{\{phone\}\}/g, user.phone || '');
    html = html.replace(/\{\{role\}\}/g, user.role || 'user');
    html = html.replace(/\{\{is_active\}\}/g, user.is_active ? 'true' : 'false');
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).send('Ошибка при загрузке страницы');
  }
}

/**
 * GET /admin/logs — страница логов
 */
async function renderLogs(req, res) {
  try {
    // Параметры фильтрации
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      action: req.query.action || null,
      search: req.query.search || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    
    // Получаем данные
    const logs = await getActivityLogs(filters);
    const totalCount = await getActivityLogsCount(filters);
    const stats = await getActivityStats(30);
    const users = await getAllUsers();
    const actions = await getUniqueActions();
    
    // Читаем HTML
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-logs.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Статистика
    html = html.replace(/\{\{stats\.total\}\}/g, stats.total || 0);
    html = html.replace(/\{\{stats\.unique_users\}\}/g, stats.unique_users || 0);
    html = html.replace(/\{\{stats\.logins\}\}/g, stats.logins || 0);
    html = html.replace(/\{\{stats\.failed_logins\}\}/g, stats.failed_logins || 0);
    html = html.replace(/\{\{stats\.equipment_actions\}\}/g, stats.equipment_actions || 0);
    html = html.replace(/\{\{stats\.user_actions\}\}/g, stats.user_actions || 0);
    html = html.replace(/\{\{stats\.deletes\}\}/g, stats.deletes || 0);
    
    // Список пользователей для фильтра
    let userOptions = '<option value="">Все пользователи</option>';
    users.forEach(u => {
      const selected = filters.userId === u.id ? 'selected' : '';
      userOptions += `<option value="${u.id}" ${selected}>${u.full_name || u.username}</option>`;
    });
    html = html.replace('{{user_options}}', userOptions);
    
    // Список действий для фильтра
    const actionNames = {
      'login': '🔐 Вход',
      'logout': '🚪 Выход',
      'login_failed': '❌ Неудачный вход',
      'password_change': '🔑 Смена пароля',
      'profile_update': '👤 Обновление профиля',
      'user_create': '➕ Создание пользователя',
      'user_update': '✏️ Редактирование пользователя',
      'user_delete': '🗑️ Удаление пользователя',
      'user_block': '🚫 Блокировка пользователя',
      'user_unblock': '✅ Разблокировка пользователя',
      'user_password_reset': '🔑 Сброс пароля',
      'equipment_create': '➕ Добавление техники',
      'equipment_update': '✏️ Редактирование техники',
      'equipment_delete': '🗑️ Удаление техники',
      'equipment_assign': '📦 Назначение техники',
      'equipment_return': '↩️ Возврат техники'
    };
    
    let actionOptions = '<option value="">Все действия</option>';
    actions.forEach(a => {
      const selected = filters.action === a.action ? 'selected' : '';
      const label = actionNames[a.action] || a.action;
      actionOptions += `<option value="${a.action}" ${selected}>${label} (${a.count})</option>`;
    });
    html = html.replace('{{action_options}}', actionOptions);
    
    // Значения фильтров
    html = html.replace(/\{\{filter\.search\}\}/g, filters.search || '');
    html = html.replace(/\{\{filter\.dateFrom\}\}/g, filters.dateFrom || '');
    html = html.replace(/\{\{filter\.dateTo\}\}/g, filters.dateTo || '');
    
    // Строки логов
    let logRows = '';
    if (logs.length === 0) {
      logRows = `
        <tr>
          <td colspan="6" class="empty-row">
            <div class="empty-state">
              <span class="emoji">📭</span>
              <h3>Логи не найдены</h3>
              <p>Попробуйте изменить фильтры</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      logs.forEach(log => {
        // Цвет для действия
        let actionClass = 'log-action-default';
        if (log.action.includes('delete')) actionClass = 'log-action-delete';
        else if (log.action.includes('create')) actionClass = 'log-action-create';
        else if (log.action.includes('update')) actionClass = 'log-action-update';
        else if (log.action === 'login') actionClass = 'log-action-login';
        else if (log.action === 'login_failed') actionClass = 'log-action-failed';
        else if (log.action.includes('block')) actionClass = 'log-action-block';
        
        const actionLabel = actionNames[log.action] || log.action;
        
        // Формируем детали
        let detailsHtml = '—';
        if (log.details) {
          try {
            const parsed = JSON.parse(log.details);
            detailsHtml = Object.entries(parsed)
              .map(([k, v]) => `<span class="log-detail-key">${k}:</span> <span class="log-detail-value">${v}</span>`)
              .join('<br>');
          } catch {
            detailsHtml = escapeHtml(log.details);
          }
        }
        
        // Пользователь
        const userName = log.user_full_name || log.username || '—';
        const userInitials = getInitials(log.user_full_name || log.username);
        
        logRows += `
          <tr>
            <td class="log-date">${formatDateTime(log.created_at)}</td>
            <td>
              <div class="log-user">
                <span class="log-avatar">${userInitials}</span>
                <div>
                  <div class="log-user-name">${userName}</div>
                  ${log.user_department ? `<div class="log-user-dept">${log.user_department}</div>` : ''}
                </div>
              </div>
            </td>
            <td><span class="log-action ${actionClass}">${actionLabel}</span></td>
            <td class="log-entity">
              ${log.entity_type ? `<span class="log-entity-type">${log.entity_type}</span>` : ''}
              ${log.entity_id ? `<span class="log-entity-id">#${log.entity_id}</span>` : ''}
              ${!log.entity_type && !log.entity_id ? '—' : ''}
            </td>
            <td class="log-details">${detailsHtml}</td>
            <td class="log-ip">${log.ip_address || '—'}</td>
          </tr>
        `;
      });
    }
    html = html.replace('{{log_rows}}', logRows);
    
    // Пагинация
    const totalPages = Math.ceil(totalCount / filters.limit);
    const currentPage = Math.floor(filters.offset / filters.limit) + 1;
    
    let pagination = '';
    if (totalPages > 1) {
      pagination = `<div class="pagination">`;
      pagination += `<span class="pagination-info">Страница ${currentPage} из ${totalPages} (всего: ${totalCount})</span>`;
      pagination += `<div class="pagination-buttons">`;
      
      // Формируем query string
      const buildQuery = (offset) => {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.action) params.set('action', filters.action);
        if (filters.search) params.set('search', filters.search);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        params.set('limit', filters.limit);
        params.set('offset', offset);
        return '?' + params.toString();
      };
      
      if (filters.offset > 0) {
        pagination += `<a href="/admin/logs${buildQuery(filters.offset - filters.limit)}" class="pagination-btn">← Назад</a>`;
      }
      
      if (filters.offset + filters.limit < totalCount) {
        pagination += `<a href="/admin/logs${buildQuery(filters.offset + filters.limit)}" class="pagination-btn">Вперёд →</a>`;
      }
      
      pagination += `</div></div>`;
    } else {
      pagination = `<div class="pagination"><span class="pagination-info">Всего: ${totalCount} записей</span></div>`;
    }
    html = html.replace('{{pagination}}', pagination);
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка загрузки логов:', error);
    res.status(500).send('Ошибка загрузки страницы логов');
  }
}

/**
 * Форматирование даты и времени
 */
function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * GET /api/admin/logs — API логов (для автообновления)
 */
async function getLogsAPI(req, res) {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      action: req.query.action || null,
      search: req.query.search || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    
    const logs = await getActivityLogs(filters);
    const total = await getActivityLogsCount(filters);
    
    res.json({ logs, total, filters });
  } catch (error) {
    console.error('❌ Ошибка API логов:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/logs/stats — статистика
 */
async function getLogsStatsAPI(req, res) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const stats = await getActivityStats(days);
    const byDay = await getActivityByDay(14);
    
    res.json({ stats, byDay });
  } catch (error) {
    console.error('❌ Ошибка статистики:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/logs/clean — очистка старых логов
 */
async function cleanLogsAPI(req, res) {
  try {
    const days = req.body.days ? parseInt(req.body.days) : 90;
    
    if (days < 30) {
      return res.status(400).json({ 
        error: 'Нельзя удалять логи младше 30 дней' 
      });
    }
    
    const result = await cleanOldLogs(days);
    
    // Логируем само действие
    const { logAction } = require('../utils/logger');
    await logAction({
      req,
      action: 'logs_clean',
      details: JSON.stringify({ days, deleted: result.deleted })
    });
    
    res.json({ 
      success: true, 
      message: `Удалено ${result.deleted} старых записей`,
      deleted: result.deleted
    });
  } catch (error) {
    console.error('❌ Ошибка очистки логов:', error);
    res.status(500).json({ error: error.message });
  }
}

// ===== ЭКСПОРТЫ =====

module.exports = {
  // Страницы
  renderAdmin,
  renderLogs,              // ← НОВОЕ
  
  // API для техники
  getEquipmentAPI,
  getEquipmentByIdAPI,
  addEquipmentAPI,
  updateEquipmentAPI,
  deleteEquipmentAPI,
  
  // Страницы для техники
  renderAddEquipment,
  renderEditEquipment,
  
  // API для пользователей
  getUsersAPI,
  getUserByIdAPI,
  addUserAPI,
  updateUserAPI,
  deleteUserAPI,
  resetUserPasswordAPI,
  blockUserAPI,
  unblockUserAPI,
  getUserDetailsAPI,
  
  // Страницы для пользователей
  renderAddUser,
  renderEditUser,
  
  // Логи                              ← НОВОЕ
  getLogsAPI,
  getLogsStatsAPI,
  cleanLogsAPI
};