// routes/admin.js
// Админ-панель: управление техникой, пользователями, логами

const fs = require('fs');
const path = require('path');
const {
  // Equipment
  getAllEquipment,
  getEquipmentById,
  getEquipmentWithUsers,
  getEquipmentWithLocation,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  assignEquipment,
  returnEquipmentByEquipmentId,
  // Users
  getAllUsers,
  getUserById,
  getUserWithDetails,
  getAllUsersWithDetails,
  createUserWithPassword,
  checkUserExists,
  deleteUserWithEquipmentReturn,
  updateUserPassword,
  setUserActive,
  // Logs
  getActivityLogs,
  getActivityLogsCount,
  getUniqueActions,
  getActivityStats,
  getActivityByDay,
  cleanOldLogs,
  // Stats
  getStats,
  // Move
  moveEquipmentToCellDetailed,
  getEquipmentMoves,
} = require('../database/db');

// Утилиты
const { 
  hashPassword, 
  generateTempPassword,
  validateUsername,
  validateEmail,
} = require('../utils/auth');

const { logAction } = require('../utils/logger');

// Layout
const { renderPage } = require('../utils/layout');

// ============================================================
// СТРАНИЦЫ
// ============================================================

/**
 * GET /admin — админ-панель
 */
async function renderAdmin(req, res) {
  try {
    const stats = await getStats();
    const equipment = await getEquipmentWithLocation();  // ← изменено на getEquipmentWithLocation
    const users = await getAllUsersWithDetails();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Статистика
    html = html.replace(/\{\{total_equipment\}\}/g, stats.total_equipment || 0);
    html = html.replace(/\{\{available_equipment\}\}/g, stats.available_equipment || 0);
    html = html.replace(/\{\{assigned_equipment\}\}/g, stats.assigned_equipment || 0);
    html = html.replace(/\{\{total_users\}\}/g, stats.total_users || 0);
    
    // Таблица техники
    let equipmentRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const deleteButton = item.status === 'available' 
        ? `<button onclick="deleteEquipment(${item.id})" class="btn-icon btn-delete" title="Удалить">🗑️</button>` 
        : '';
      
      // Информация о назначении
      let assignedInfo = '—';
      if (item.status === 'assigned' && item.user_name) {
        const initials = getInitials(item.user_name);
        assignedInfo = `
          <div class="assigned-cell">
            <span class="assigned-avatar">${initials}</span>
            <div class="assigned-info">
              <div class="assigned-name">${item.user_name}</div>
              ${item.user_department ? `<div class="assigned-dept">${item.user_department}</div>` : ''}
            </div>
          </div>
        `;
      } else if (item.status === 'assigned') {
        assignedInfo = '<span style="color: #a0aec0; font-size: 12px;">не найдено</span>';
      }
      
      // Категория
      const categoryCell = item.category_name 
        ? `<span class="catalog-badge">${item.category_icon || '📁'} ${item.category_name}</span>`
        : '<span style="color: #cbd5e0;">—</span>';
      
      // Тип
      const typeCell = item.type_name 
        ? `<span class="catalog-badge type">${item.type_icon || '📦'} ${item.type_name}</span>`
        : '<span style="color: #cbd5e0;">—</span>';
      
      // 🆕 Место хранения: склад ИЛИ рабочее место
      let cellInfo = '<span style="color: #cbd5e0;">—</span>';
      if (item.cell_id) {
        cellInfo = `<div class="location-cell" title="${item.warehouse_name} → ${item.zone_name} → ${item.rack_name} → ${item.cell_name}">
             <div class="location-cell-code">${item.cell_code || item.cell_name}</div>
             <div class="location-path" style="font-size: 10px;">${item.warehouse_name}</div>
           </div>`;
      } else if (item.workplace_id) {
        const wpLabel = `${item.workplace_name || 'Место'}${item.workplace_code ? ` [${item.workplace_code}]` : ''}`;
        const officeLabel = item.office_name || '';
        const link = item.office_id
          ? `/admin/workplaces/${item.office_id}?highlightWorkplace=${item.workplace_id}`
          : '#';
        cellInfo = `<div class="location-cell">
             <a href="${link}" class="location-cell-code" style="background: var(--purple-bg); color: var(--purple); text-decoration: none;" title="Открыть в дереве офиса">🪑 ${wpLabel}</a>
             <div class="location-path" style="font-size: 10px;">${officeLabel}</div>
           </div>`;
      }
      
      const statusLabels = {
        'available':   '✅ Доступна',
        'placed':      '🪑 На месте',
        'assigned':    '👤 Назначена',
        'maintenance': '🔧 В ремонте',
        'retired':     '❌ Списана',
      };
      const statusLabel = statusLabels[item.status] || item.status;

      equipmentRows += `
        <tr>
          <td>${item.id}</td>
          <td><strong>${item.inventory_number}</strong></td>
          <td>${item.name}</td>
          <td>${item.model || '—'}</td>
          <td>${categoryCell}</td>
          <td>${typeCell}</td>
          <td>${cellInfo}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td>${assignedInfo}</td>
          <td>
            <div class="action-buttons">
              <button onclick="viewEquipment(${item.id})" class="btn-icon btn-info" title="Просмотр">👁️</button>
              <button onclick="editEquipment(${item.id})" class="btn-icon btn-edit" title="Редактировать">✏️</button>
              ${item.status !== 'assigned' ? `<button onclick="openMoveEquipmentModal(${item.id})" class="btn-icon btn-move" title="Переместить">🔄</button>` : ''}
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
      
      const roleBadge = isAdmin
        ? '<span class="role-badge role-admin">👑 Админ</span>'
        : '<span class="role-badge role-user">👤 Пользователь</span>';
      
      const statusBadge = isActive
        ? '<span class="status-badge status-available">Активен</span>'
        : '<span class="status-badge status-retired">Заблокирован</span>';
      
      const lastLogin = user.last_login 
        ? formatDate(user.last_login) 
        : '<span style="color: #a0aec0;">никогда</span>';
      
      const blockButton = isActive
        ? `<button onclick="blockUser(${user.id})" class="btn-icon btn-warning" title="Заблокировать">🚫</button>`
        : `<button onclick="unblockUser(${user.id})" class="btn-icon btn-success" title="Разблокировать">✅</button>`;
      
      userRows += `
        <tr class="${!isActive ? 'row-blocked' : ''}">
          <td>${user.id}</td>
          <td>
            <div class="user-cell">
              <span class="user-avatar">${getInitials(user.full_name || user.username)}</span>
              <div>
                <div class="user-name">${user.full_name || user.username}</div>
                <div class="user-username">@${user.username}</div>
              </div>
            </div>
          </td>
          <td>${user.email}</td>
          <td>${user.department || '—'}</td>
          <td>${roleBadge}</td>
          <td><span class="badge-count ${hasEquipment ? 'has-items' : 'no-items'}">${equipmentCount}</span></td>
          <td>${statusBadge}</td>
          <td style="font-size: 12px; color: #666;">${lastLogin}</td>
          <td>
            <div class="action-buttons">
              <button onclick="viewUser(${user.id})" class="btn-icon btn-info" title="Просмотр">👁️</button>
              <button onclick="editUser(${user.id})" class="btn-icon btn-edit" title="Редактировать">✏️</button>
              <button onclick="resetUserPassword(${user.id}, '${user.username}')" class="btn-icon btn-warning" title="Сбросить пароль">🔑</button>
              ${blockButton}
              <button onclick="deleteUser(${user.id}, '${escapeAttr(user.full_name || user.username)}')" class="btn-icon btn-delete" title="Удалить">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });
    html = html.replace('{{user_rows}}', userRows);
    
    const fullHtml = renderPage({
      title: 'Админ-панель – MoveIT service',
      content: html,
      pageCss: '/css/admin.css',
      pageJs: '/js/admin.js',
    });
    
    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка загрузки админ-панели:', error);
    res.status(500).send('Ошибка при загрузке админ-панели');
  }
}

// ============================================================
// API — ТЕХНИКА
// ============================================================

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
      status, description, category_id, type_id, cell_id
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
      description: description || '',
      category_id: category_id ? parseInt(category_id) : null,
      type_id: type_id ? parseInt(type_id) : null,
      cell_id: cell_id ? parseInt(cell_id) : null,
    });
    
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
      status, description, assign_user_id, assign_condition,
      category_id, type_id, cell_id, workplace_id
    } = req.body;
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
    let assignmentResult = null;
    
    // 🆕 Финальные значения места хранения: склад ИЛИ рабочее место
    let finalCellId = cell_id ? parseInt(cell_id) : null;
    let finalWorkplaceId = workplace_id ? parseInt(workplace_id) : null;

    // Взаимоисключение: если выбрано рабочее место — обнуляем ячейку
    if (finalWorkplaceId) {
      finalCellId = null;
    }
    // Если выбрана ячейка — обнуляем рабочее место
    if (finalCellId) {
      finalWorkplaceId = null;
    }

    // Если статус = assigned — принудительно обнуляем оба
    if (status === 'assigned') {
      finalCellId = null;
      finalWorkplaceId = null;
    }

    // 🆕 Согласование статуса с расположением.
    // Если статус 'placed', но место не указано — статус становится 'available'.
    // Если статус 'available' и указано место — статус становится 'placed'.
    // 'assigned' / 'maintenance' / 'retired' — не трогаем.
    let finalStatus = status || 'available';
    if (finalStatus === 'placed' && !finalWorkplaceId) {
      finalStatus = 'available';
    } else if (finalStatus === 'available' && finalWorkplaceId) {
      finalStatus = 'placed';
    }

    // 🆕 Проверка ячейки: is_full и capacity (как в moveEquipmentToCell)
    // Только если ячейка реально меняется (или назначается заново).
    if (finalCellId && finalCellId !== existing.cell_id) {
      const { db } = require('../database/db');

      const cellCheck = await new Promise((resolve, reject) => {
        db.get(`
          SELECT c.id, c.name, c.code, c.capacity, c.is_full,
                 (SELECT COUNT(*) FROM equipment 
                  WHERE cell_id = c.id AND id != ?
                 ) as current_count
          FROM cells c
          WHERE c.id = ?
        `, [id, finalCellId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!cellCheck) {
        return res.status(400).json({ error: 'Ячейка не найдена' });
      }
      if (cellCheck.is_full === 1) {
        return res.status(400).json({ 
          error: `Ячейка ${cellCheck.code || cellCheck.name} отмечена как заполненная` 
        });
      }
      if (cellCheck.capacity && cellCheck.current_count >= cellCheck.capacity) {
        return res.status(400).json({ 
          error: `Ячейка ${cellCheck.code || cellCheck.name} переполнена (${cellCheck.current_count}/${cellCheck.capacity})` 
        });
      }
    }
    
    // Если назначаем технику пользователю
    if (status === 'assigned' && assign_user_id) {
      // Если техника была назначена — закрываем старое назначение
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
        
        if (oldAssignment && oldAssignment.user_id !== parseInt(assign_user_id)) {
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE user_equipment 
               SET returned_date = CURRENT_TIMESTAMP, 
                   condition_on_return = 'Автовозврат: переназначение',
                   notes = COALESCE(notes, '') || ' | Возврат при переназначении'
               WHERE id = ?`,
              [oldAssignment.id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
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
      
      try {
        assignmentResult = await assignEquipment(
          parseInt(assign_user_id),
          id,
          assign_condition || 'В хорошем состоянии',
          'Назначено через редактирование техники'
        );
        
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
        return res.status(400).json({ error: error.message });
      }
    }
    
    // Если статус меняется с assigned на available — возвращаем технику
    if (oldStatus === 'assigned' && status === 'available') {
      const { returnEquipmentByEquipmentId } = require('../database/db');
      try {
        await returnEquipmentByEquipmentId(
          id, 
          'Возвращена при изменении статуса', 
          'Автоматический возврат'
        );
        
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
        console.warn('⚠️ Не удалось вернуть технику:', error.message);
      }
    }
    
    // Обновляем технику с финальным cell_id
    const result = await updateEquipment(id, {
      inventory_number,
      name,
      model: model || '',
      serial_number: serial_number || '',
      manufacturer: manufacturer || '',
      purchase_date: purchase_date || null,
      warranty_until: warranty_until || null,
      status: finalStatus,
      description: description || '',
      category_id: category_id ? parseInt(category_id) : null,
      type_id: type_id ? parseInt(type_id) : null,
      cell_id: finalCellId,
      workplace_id: finalWorkplaceId,
    });
    
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
      assignment: assignmentResult
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
    
    await logAction({
      req,
      action: 'equipment_delete',
      entityType: 'equipment',
      entityId: id,
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

// ============================================================
// СТРАНИЦЫ ТЕХНИКИ
// ============================================================

/**
 * GET /admin/add — страница добавления техники
 */
function renderAddEquipment(req, res) {
  try {
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-add.html');
    const content = fs.readFileSync(htmlPath, 'utf8');

    const fullHtml = renderPage({
      title: 'Добавить технику – MoveIT service',
      content,
      pageCss: '/css/admin-add.css',
      pageJs: '/js/admin-add.js',
    });

    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка загрузки страницы добавления:', error);
    res.status(500).send('Ошибка загрузки страницы');
  }
}

/**
 * GET /admin/edit/:id — страница редактирования техники
 */
async function renderEditEquipment(req, res) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).send('Неверный ID');
    }

    const equipment = await getEquipmentById(id);

    if (!equipment) {
      return res.status(404).send('Техника не найдена');
    }

    const htmlPath = path.join(__dirname, '..', 'views', 'admin-edit.html');
    let content = fs.readFileSync(htmlPath, 'utf8');

    // Скалярные плейсхолдеры — с /g
    content = content.replace(/\{\{id\}\}/g, equipment.id);
    content = content.replace(/\{\{inventory_number\}\}/g, escapeHtml(equipment.inventory_number || ''));
    content = content.replace(/\{\{name\}\}/g, escapeHtml(equipment.name || ''));
    content = content.replace(/\{\{model\}\}/g, escapeHtml(equipment.model || ''));
    content = content.replace(/\{\{serial_number\}\}/g, escapeHtml(equipment.serial_number || ''));
    content = content.replace(/\{\{manufacturer\}\}/g, escapeHtml(equipment.manufacturer || ''));
    content = content.replace(/\{\{purchase_date\}\}/g, equipment.purchase_date || '');
    content = content.replace(/\{\{warranty_until\}\}/g, equipment.warranty_until || '');
    content = content.replace(/\{\{status\}\}/g, equipment.status || 'available');
    content = content.replace(/\{\{description\}\}/g, escapeHtml(equipment.description || ''));

    // Категория, тип, ячейка
    content = content.replace(/\{\{category_id\}\}/g, equipment.category_id || '');
    content = content.replace(/\{\{type_id\}\}/g, equipment.type_id || '');
    content = content.replace(/\{\{cell_id\}\}/g, equipment.cell_id || '');
    content = content.replace(/\{\{workplace_id\}\}/g, equipment.workplace_id || '');

    // Статусы — русские подписи
    const statusLabels = {
      'available':   '✅ Доступна',
      'placed':      '🪑 На месте',
      'assigned':    '👤 Назначена',
      'maintenance': '🔧 В ремонте',
      'retired':     '📦 Списана',
    };
    // 'placed' отображается, но выбирать вручную нельзя —
    // статус ставится автоматически при перемещении на рабочее место
    const statuses = ['available', 'placed', 'assigned', 'maintenance', 'retired'];
    let statusOptions = '';
    statuses.forEach(s => {
      const selected = s === equipment.status ? 'selected' : '';
      const isPlaced = s === 'placed';
      const disabled = isPlaced ? 'disabled' : '';
      const label = statusLabels[s] || s;
      const suffix = isPlaced ? ' (управляется перемещением)' : '';
      statusOptions += `<option value="${s}" ${selected} ${disabled}>${label}${suffix}</option>`;
    });
    // Многострочная вставка — без /g
    content = content.replace('{{status_options}}', statusOptions);

    // Пользователи для назначения
    const users = await getAllUsers();
    let userOptions = '';
    users.forEach(user => {
      const fullName = user.full_name || user.username;
      const dept = user.department ? ` (${user.department})` : '';
      userOptions += `<option value="${user.id}">${escapeHtml(fullName)}${escapeHtml(dept)}</option>`;
    });
    // Многострочная вставка — без /g
    content = content.replace('{{user_options}}', userOptions);

    // 🆕 Правая колонка: текущая информация (2.11.8.2)
    const infoStatus = statusLabels[equipment.status] || equipment.status || '—';

    content = content.replace(/\{\{info_inventory\}\}/g, escapeHtml(equipment.inventory_number || '—'));
    content = content.replace(/\{\{info_name\}\}/g, escapeHtml(equipment.name || '—'));
    content = content.replace(/\{\{info_category\}\}/g,
      equipment.category_name
        ? `${equipment.category_icon || '📁'} ${escapeHtml(equipment.category_name)}`
        : '—'
    );
    content = content.replace(/\{\{info_type\}\}/g,
      equipment.type_name
        ? `${equipment.type_icon || '📦'} ${escapeHtml(equipment.type_name)}`
        : '—'
    );
    content = content.replace(/\{\{info_model\}\}/g, escapeHtml(equipment.model || '—'));
    content = content.replace(/\{\{info_serial\}\}/g, escapeHtml(equipment.serial_number || '—'));
    content = content.replace(/\{\{info_status\}\}/g, escapeHtml(infoStatus));

    const fullHtml = renderPage({
      title: 'Редактировать технику – MoveIT service',
      content,
      pageCss: '/css/admin-edit.css',
      pageJs: '/js/admin-edit.js',
    });

    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка при загрузке страницы редактирования:', error);
    res.status(500).send('Ошибка при загрузке страницы');
  }
}

// ============================================================
// API — ПОЛЬЗОВАТЕЛИ
// ============================================================

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

async function getUserDetailsAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserWithDetails(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const { getUserActiveEquipment, getUserEquipmentHistory } = require('../database/db');
    const activeEquipment = await getUserActiveEquipment(id);
    const history = await getUserEquipmentHistory(id);
    
    const stats = {
      active: activeEquipment.length,
      total: history.length,
      returned: history.filter(h => h.returned_date).length
    };
    
    delete user.password_hash;
    
    res.json({
      user,
      stats,
      activeEquipment,
      history: history.slice(0, 30)
    });
  } catch (error) {
    console.error('❌ Ошибка получения деталей:', error);
    res.status(500).json({ error: error.message });
  }
}

async function addUserAPI(req, res) {
  try {
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
    
    const existing = await checkUserExists(username.trim(), email.trim());
    if (existing) {
      if (existing.username === username.trim()) {
        return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
      }
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';
    const tempPassword = generateTempPassword(12);
    const passwordHash = await hashPassword(tempPassword);
    
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
      tempPassword: tempPassword,
      warning: 'Сохраните пароль! Он больше не будет показан.'
    });
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
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
    
    const newRole = ['admin', 'user'].includes(role) ? role : user.role;
    
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

async function deleteUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    if (id === req.session.userId) {
      return res.status(400).json({ error: 'Нельзя удалить себя' });
    }
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
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
          error: 'Нельзя удалить последнего администратора' 
        });
      }
    }
    
    const result = await deleteUserWithEquipmentReturn(id);
    
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

async function resetUserPasswordAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const tempPassword = generateTempPassword(12);
    const passwordHash = await hashPassword(tempPassword);
    
    await updateUserPassword(id, passwordHash, 1);
    
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

async function blockUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    if (id === req.session.userId) {
      return res.status(400).json({ error: 'Нельзя заблокировать себя' });
    }
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
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
          error: 'Нельзя заблокировать последнего администратора' 
        });
      }
    }
    
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

async function unblockUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
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

// ============================================================
// СТРАНИЦЫ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================

/**
 * GET /admin/user/add — страница добавления пользователя
 */
function renderAddUser(req, res) {
  try {
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-user-add.html');
    const content = fs.readFileSync(htmlPath, 'utf8');

    const fullHtml = renderPage({
      title: 'Добавить пользователя – MoveIT service',
      content,
      pageJs: '/js/admin-user-add.js',
    });

    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка загрузки страницы добавления пользователя:', error);
    res.status(500).send('Ошибка загрузки страницы');
  }
}

/**
 * GET /admin/user/edit/:id — страница редактирования пользователя
 */
async function renderEditUser(req, res) {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    const htmlPath = path.join(__dirname, '..', 'views', 'admin-user-edit.html');
    let content = fs.readFileSync(htmlPath, 'utf8');

    // Скалярные плейсхолдеры — с /g и экранированием
    content = content.replace(/\{\{id\}\}/g, user.id);
    content = content.replace(/\{\{username\}\}/g, escapeHtml(user.username || ''));
    content = content.replace(/\{\{email\}\}/g, escapeHtml(user.email || ''));
    content = content.replace(/\{\{full_name\}\}/g, escapeHtml(user.full_name || ''));
    content = content.replace(/\{\{department\}\}/g, escapeHtml(user.department || ''));
    content = content.replace(/\{\{phone\}\}/g, escapeHtml(user.phone || ''));
    content = content.replace(/\{\{role\}\}/g, user.role || 'user');

    const fullHtml = renderPage({
      title: 'Редактировать пользователя – MoveIT service',
      content,
      pageJs: '/js/admin-user-edit.js',
    });

    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка при загрузке страницы редактирования пользователя:', error);
    res.status(500).send('Ошибка при загрузке страницы');
  }
}

// ============================================================
// ЛОГИ
// ============================================================

/**
 * GET /admin/logs — страница логов активности
 */
async function renderLogs(req, res) {
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
    const totalCount = await getActivityLogsCount(filters);
    const stats = await getActivityStats(30);
    const users = await getAllUsers();
    const actions = await getUniqueActions();

    const htmlPath = path.join(__dirname, '..', 'views', 'admin-logs.html');
    let content = fs.readFileSync(htmlPath, 'utf8');

    content = content.replace(/\{\{stats\.total\}\}/g, stats.total || 0);
    content = content.replace(/\{\{stats\.unique_users\}\}/g, stats.unique_users || 0);
    content = content.replace(/\{\{stats\.logins\}\}/g, stats.logins || 0);
    content = content.replace(/\{\{stats\.failed_logins\}\}/g, stats.failed_logins || 0);
    content = content.replace(/\{\{stats\.equipment_actions\}\}/g, stats.equipment_actions || 0);
    content = content.replace(/\{\{stats\.user_actions\}\}/g, stats.user_actions || 0);
    content = content.replace(/\{\{stats\.deletes\}\}/g, stats.deletes || 0);

    // Список пользователей для фильтра
    let userOptions = '<option value="">Все пользователи</option>';
    users.forEach(u => {
      const selected = filters.userId === u.id ? 'selected' : '';
      userOptions += `<option value="${u.id}" ${selected}>${escapeHtml(u.full_name || u.username)}</option>`;
    });
    content = content.replace('{{user_options}}', userOptions);

    // Список действий
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
      'equipment_return': '↩️ Возврат техники',
      'equipment_move': '🔄 Перемещение техники',
      'category_create': '📁 Создание категории',
      'category_update': '📁 Редактирование категории',
      'category_delete': '📁 Удаление категории',
      'type_create': '📦 Создание типа',
      'type_update': '📦 Редактирование типа',
      'type_delete': '📦 Удаление типа',
      'warehouse_create': '🏢 Создание склада',
      'warehouse_update': '🏢 Редактирование склада',
      'warehouse_delete': '🏢 Удаление склада',
      'warehouse_set_default': '⭐ Склад по умолчанию',
      'zone_create': '📍 Создание зоны',
      'zone_update': '📍 Редактирование зоны',
      'zone_delete': '📍 Удаление зоны',
      'rack_create': '🗄️ Создание стеллажа',
      'rack_update': '🗄️ Редактирование стеллажа',
      'rack_delete': '🗄️ Удаление стеллажа',
      'cell_create': '📦 Создание ячейки',
      'cell_update': '📦 Редактирование ячейки',
      'cell_delete': '📦 Удаление ячейки',
    };

    let actionOptions = '<option value="">Все действия</option>';
    actions.forEach(a => {
      const selected = filters.action === a.action ? 'selected' : '';
      const label = actionNames[a.action] || a.action;
      actionOptions += `<option value="${a.action}" ${selected}>${label} (${a.count})</option>`;
    });
    content = content.replace('{{action_options}}', actionOptions);

    content = content.replace(/\{\{filter\.search\}\}/g, escapeHtml(filters.search || ''));
    content = content.replace(/\{\{filter\.dateFrom\}\}/g, filters.dateFrom || '');
    content = content.replace(/\{\{filter\.dateTo\}\}/g, filters.dateTo || '');

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
        let actionClass = 'log-action-default';
        if (log.action.includes('delete')) actionClass = 'log-action-delete';
        else if (log.action.includes('create')) actionClass = 'log-action-create';
        else if (log.action.includes('update')) actionClass = 'log-action-update';
        else if (log.action === 'login') actionClass = 'log-action-login';
        else if (log.action === 'login_failed') actionClass = 'log-action-failed';
        else if (log.action.includes('block')) actionClass = 'log-action-block';
        else if (log.action === 'equipment_move') actionClass = 'log-action-move';

        const actionLabel = actionNames[log.action] || log.action;

        let detailsHtml = '—';
        if (log.details) {
          try {
            const parsed = JSON.parse(log.details);
            detailsHtml = Object.entries(parsed)
              .map(([k, v]) => `<span class="log-detail-key">${escapeHtml(k)}:</span> <span class="log-detail-value">${escapeHtml(String(v))}</span>`)
              .join('<br>');
          } catch {
            detailsHtml = escapeHtml(log.details);
          }
        }

        const userName = log.user_full_name || log.username || '—';
        const userInitials = getInitials(log.user_full_name || log.username);

        logRows += `
          <tr>
            <td class="log-date">${formatDateTime(log.created_at)}</td>
            <td>
              <div class="log-user">
                <span class="log-avatar">${userInitials}</span>
                <div>
                  <div class="log-user-name">${escapeHtml(userName)}</div>
                  ${log.user_department ? `<div class="log-user-dept">${escapeHtml(log.user_department)}</div>` : ''}
                </div>
              </div>
            </td>
            <td><span class="log-action ${actionClass}">${actionLabel}</span></td>
            <td class="log-entity">
              ${log.entity_type ? `<span class="log-entity-type">${escapeHtml(log.entity_type)}</span>` : ''}
              ${log.entity_id ? `<span class="log-entity-id">#${log.entity_id}</span>` : ''}
              ${!log.entity_type && !log.entity_id ? '—' : ''}
            </td>
            <td class="log-details">${detailsHtml}</td>
            <td class="log-ip">${log.ip_address || '—'}</td>
          </tr>
        `;
      });
    }
    content = content.replace('{{log_rows}}', logRows);

    // Пагинация
    const totalPages = Math.ceil(totalCount / filters.limit);
    const currentPage = Math.floor(filters.offset / filters.limit) + 1;

    let pagination = '';
    if (totalPages > 1) {
      pagination = `<div class="pagination">`;
      pagination += `<span class="pagination-info">Страница ${currentPage} из ${totalPages} (всего: ${totalCount})</span>`;
      pagination += `<div class="pagination-buttons">`;

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
    content = content.replace('{{pagination}}', pagination);

    const fullHtml = renderPage({
      title: 'Логи активности – MoveIT service',
      content,
      pageCss: '/css/logs.css',
      pageJs: '/js/logs.js',
    });

    res.send(fullHtml);
  } catch (error) {
    console.error('❌ Ошибка загрузки логов:', error);
    res.status(500).send('Ошибка загрузки страницы логов');
  }
}

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

async function cleanLogsAPI(req, res) {
  try {
    const days = req.body.days ? parseInt(req.body.days) : 90;
    
    if (days < 30) {
      return res.status(400).json({ 
        error: 'Нельзя удалять логи младше 30 дней' 
      });
    }
    
    const result = await cleanOldLogs(days);
    
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

// ============================================================
// ДЕТАЛИ ТЕХНИКИ (карточка)
// ============================================================

/**
 * GET /api/admin/equipment/:id/details — детали техники + история
 */
async function getEquipmentDetailsAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID техники' });
    }
    
    // Получаем технику
    const equipment = await getEquipmentById(id);
    if (!equipment) {
      return res.status(404).json({ error: 'Техника не найдена' });
    }
    
    // Получаем историю использования
    const { getEquipmentHistory } = require('../database/db');
    const history = await getEquipmentHistory(id);
    
    // Ищем активное назначение
    const activeAssignment = history.find(h => h.status === 'active');
    
    // Статистика
    const stats = {
      total: history.length,
      active: activeAssignment ? 1 : 0,
      returned: history.filter(h => h.status === 'returned').length,
      current_user: activeAssignment ? {
        id: activeAssignment.user_id,
        full_name: activeAssignment.full_name,
        username: activeAssignment.username,
        department: activeAssignment.department,
        email: activeAssignment.email,
        assigned_date: activeAssignment.assigned_date,
        condition_on_assign: activeAssignment.condition_on_assign
      } : null
    };

    // 🆕 Текущее расположение: пользователь / рабочее место / ячейка / ничего
    let location = { type: 'none' };

    if (activeAssignment) {
      location = {
        type: 'user',
        user: stats.current_user,
      };
    } else if (equipment.workplace_id) {
      location = {
        type: 'workplace',
        workplace_id: equipment.workplace_id,
        workplace_name: equipment.workplace_name,
        workplace_code: equipment.workplace_code,
        room_id: equipment.room_id,
        room_name: equipment.room_name,
        office_id: equipment.office_id,
        office_name: equipment.office_name,
      };
    } else if (equipment.cell_id) {
      location = {
        type: 'cell',
        cell_id: equipment.cell_id,
        cell_name: equipment.cell_name,
        cell_code: equipment.cell_code,
        rack_name: equipment.rack_name,
        zone_name: equipment.zone_name,
        warehouse_id: equipment.warehouse_id,
        warehouse_name: equipment.warehouse_name,
      };
    }

    res.json({
      equipment,
      stats,
      location,
      history
    });
  } catch (error) {
    console.error('❌ Ошибка получения деталей техники:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(p => p);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

// ============================================================
// API — ПЕРЕМЕЩЕНИЕ ТЕХНИКИ
// ============================================================

/**
 * POST /api/admin/equipment/:id/move — переместить технику в ячейку
 */
async function moveEquipmentAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID техники' });
    }
    
    const { cell_id, notes } = req.body;
    
    // Проверяем технику
    const equipment = await getEquipmentById(id);
    if (!equipment) {
      return res.status(404).json({ error: 'Техника не найдена' });
    }
    
    // Нельзя перемещать назначенную технику
    if (equipment.status === 'assigned') {
      return res.status(400).json({ 
        error: 'Нельзя переместить назначенную технику. Сначала верните её.' 
      });
    }
    
    // Перемещаем
    const result = await moveEquipmentToCellDetailed(
      id,
      cell_id ? parseInt(cell_id) : null,
      req.session.userId,
      req.session.username
    );
    
    // Если уже в этой ячейке — ничего не делаем
    if (result.already_there) {
      return res.json({ 
        success: true, 
        message: 'Техника уже в этой ячейке',
        data: result 
      });
    }
    
    // Логируем
    await logAction({
      req,
      action: 'equipment_move',
      entityType: 'equipment',
      entityId: id,
      details: JSON.stringify({
        inventory_number: result.inventory_number,
        equipment_name: result.equipment_name,
        from_cell: result.from_cell_code || result.from_cell_name || null,
        to_cell: result.to_cell_code || result.to_cell_name || null,
        to_warehouse: result.to_warehouse_name || null,
        to_zone: result.to_zone_name || null,
        to_rack: result.to_rack_name || null,
        notes: notes || null
      })
    });
    
    // Формируем сообщение
    let message = '✅ Техника перемещена';
    if (result.from_cell_code && result.to_cell_code) {
      message = `✅ Перемещено из ${result.from_cell_code} в ${result.to_cell_code}`;
    } else if (!result.from_cell_code && result.to_cell_code) {
      message = `✅ Техника размещена в ${result.to_cell_code}`;
    } else if (result.from_cell_code && !result.to_cell_code) {
      message = `✅ Техника убрана из ячейки ${result.from_cell_code}`;
    }
    
    res.json({ 
      success: true, 
      message,
      data: result 
    });
  } catch (error) {
    console.error('❌ Ошибка перемещения:', error);
    if (error.message.includes('переполнена') || 
        error.message.includes('Нельзя переместить') ||
        error.message.includes('не найдена')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * GET /api/admin/equipment/:id/moves — история перемещений
 */
async function getEquipmentMovesAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID техники' });
    }
    
    const moves = await getEquipmentMoves(id);
    res.json(moves);
  } catch (error) {
    console.error('❌ Ошибка получения истории:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================================
// ЭКСПОРТ
// ============================================================

module.exports = {
  // Страницы
  renderAdmin,
  renderLogs,
  
  // API техники
  getEquipmentAPI,
  getEquipmentByIdAPI,
  getEquipmentDetailsAPI,   // 🆕
  addEquipmentAPI,
  updateEquipmentAPI,
  deleteEquipmentAPI,
  
  // Страницы техники
  renderAddEquipment,
  renderEditEquipment,
  
  // API пользователей
  getUsersAPI,
  getUserByIdAPI,
  addUserAPI,
  updateUserAPI,
  deleteUserAPI,
  resetUserPasswordAPI,
  blockUserAPI,
  unblockUserAPI,
  getUserDetailsAPI,
  
  // Страницы пользователей
  renderAddUser,
  renderEditUser,
  
  // Логи
  getLogsAPI,
  getLogsStatsAPI,
  cleanLogsAPI,

    // 🆕 Перемещение
  moveEquipmentAPI,
  getEquipmentMovesAPI,
};