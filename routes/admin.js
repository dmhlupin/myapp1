const fs = require('fs');
const path = require('path');
const {
  getAllEquipment,
  getEquipmentById,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  getAvailableEquipment,
  getStats,
  getAllUsers,        // ← Добавлено
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  getUsersWithEquipment,
  assignEquipment     // ← Добавлено
} = require('../database/db');

// ===== СТРАНИЦЫ =====

async function renderAdmin(req, res) {
  try {
    const stats = await getStats();
    const equipment = await getAllEquipment();
    const users = await getUsersWithEquipment();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    html = html.replace('{{total_equipment}}', stats.total_equipment || 0);
    html = html.replace('{{available_equipment}}', stats.available_equipment || 0);
    html = html.replace('{{assigned_equipment}}', stats.assigned_equipment || 0);
    html = html.replace('{{total_users}}', stats.total_users || 0);
    
    let equipmentRows = '';
    equipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      const deleteButton = item.status === 'available' 
        ? `<button onclick="deleteEquipment(${item.id})" class="btn-delete">🗑️</button>` 
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
            <button onclick="editEquipment(${item.id})" class="btn-edit">✏️</button>
            ${deleteButton}
          </td>
        </tr>
      `;
    });
    html = html.replace('{{equipment_rows}}', equipmentRows);
    
    let userRows = '';
    users.forEach(user => {
      const equipmentCount = user.equipment_count || 0;
      const hasEquipment = equipmentCount > 0;
      
      userRows += `
        <tr>
          <td>${user.id}</td>
          <td><strong>${user.full_name || user.username}</strong></td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.department || '—'}</td>
          <td><span class="badge ${hasEquipment ? 'badge-active' : 'badge-inactive'}">${equipmentCount}</span></td>
          <td>
            <button onclick="editUser(${user.id})" class="btn-edit">✏️</button>
            <button onclick="deleteUser(${user.id})" class="btn-delete">🗑️</button>
          </td>
        </tr>
      `;
    });
    html = html.replace('{{user_rows}}', userRows);
    
    res.send(html);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).send('Ошибка при загрузке админ-панели');
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
    let assignmentResult = null;
    
    // Если статус меняется с available на assigned - назначаем пользователя
    if (oldStatus === 'available' && status === 'assigned') {
      if (!assign_user_id) {
        return res.status(400).json({ 
          error: 'Для назначения техники выберите пользователя' 
        });
      }
      
      try {
        assignmentResult = await assignEquipment(
          parseInt(assign_user_id),
          id,
          assign_condition || 'В хорошем состоянии',
          'Назначено через редактирование техники'
        );
        console.log(`✅ Техника ${id} назначена пользователю ${assign_user_id}`);
      } catch (error) {
        console.error('❌ Ошибка назначения:', error);
        return res.status(400).json({ error: error.message });
      }
    }
    
    // Если статус меняется с assigned на available - возвращаем технику
    if (oldStatus === 'assigned' && status === 'available') {
      try {
        // Находим активное назначение
        const assignment = await new Promise((resolve, reject) => {
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
        
        if (assignment) {
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE user_equipment 
               SET returned_date = CURRENT_TIMESTAMP, 
                   condition_on_return = ?
               WHERE id = ?`,
              ['Возвращена при изменении статуса', assignment.id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          console.log(`✅ Техника ${id} возвращена от пользователя ${assignment.user_id}`);
        }
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

async function addUserAPI(req, res) {
  try {
    const { username, email, full_name, department, phone } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Логин и email обязательны' 
      });
    }
    
    const result = await addUser({
      username,
      email,
      full_name: full_name || '',
      department: department || '',
      phone: phone || ''
    });
    
    res.json({ 
      success: true, 
      message: 'Пользователь добавлен успешно',
      data: result 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ 
        error: 'Пользователь с таким логином или email уже существует' 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

async function updateUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { username, email, full_name, department, phone } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Логин и email обязательны' 
      });
    }
    
    const result = await updateUser(id, {
      username,
      email,
      full_name: full_name || '',
      department: department || '',
      phone: phone || ''
    });
    
    res.json({ 
      success: true, 
      message: 'Пользователь обновлен успешно',
      data: result 
    });
  } catch (error) {
    if (error.message === 'Пользователь не найден') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ 
        error: 'Пользователь с таким логином или email уже существует' 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

async function deleteUserAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const result = await deleteUser(id);
    
    if (result.deleted === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ 
      success: true, 
      message: 'Пользователь удален успешно' 
    });
  } catch (error) {
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
    
    html = html.replace('{{id}}', user.id);
    html = html.replace('{{username}}', user.username || '');
    html = html.replace('{{email}}', user.email || '');
    html = html.replace('{{full_name}}', user.full_name || '');
    html = html.replace('{{department}}', user.department || '');
    html = html.replace('{{phone}}', user.phone || '');
    
    res.send(html);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).send('Ошибка при загрузке страницы');
  }
}

// ===== ЭКСПОРТЫ =====

module.exports = {
  renderAdmin,
  getEquipmentAPI,
  getEquipmentByIdAPI,
  addEquipmentAPI,
  updateEquipmentAPI,
  deleteEquipmentAPI,
  renderAddEquipment,
  renderEditEquipment,
  getUsersAPI,
  getUserByIdAPI,
  addUserAPI,
  updateUserAPI,
  deleteUserAPI,
  renderAddUser,
  renderEditUser
};