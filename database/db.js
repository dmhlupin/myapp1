const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Создаем папку для БД если её нет
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Таблица пользователей
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          full_name TEXT,
          department TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Таблица техники
        db.run(`
          CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_number TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            model TEXT,
            serial_number TEXT,
            manufacturer TEXT,
            purchase_date DATE,
            warranty_until DATE,
            status TEXT DEFAULT 'available',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Таблица сопоставлений
          db.run(`
            CREATE TABLE IF NOT EXISTS user_equipment (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              equipment_id INTEGER NOT NULL,
              assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              returned_date DATETIME,
              condition_on_assign TEXT,
              condition_on_return TEXT,
              notes TEXT,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
              UNIQUE(user_id, equipment_id, returned_date)
            )
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            db.run('CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON user_equipment(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_user_equipment_equipment ON user_equipment(equipment_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)');
            
            insertTestData()
              .then(() => resolve())
              .catch(err => {
                console.error('Ошибка при вставке тестовых данных:', err);
                reject(err);
              });
          });
        });
      });
    });
  });
}

// Вставка тестовых данных
function insertTestData() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        console.log('📊 Данные уже существуют, пропускаем вставку');
        resolve();
        return;
      }
      
      console.log('📝 Добавление тестовых данных...');
      
      // Пользователи
      const users = [
        ['ivanov', 'ivanov@company.com', 'Иван Иванов', 'IT-отдел', '+7(999)111-22-33'],
        ['petrova', 'petrova@company.com', 'Мария Петрова', 'Бухгалтерия', '+7(999)444-55-66'],
        ['sidorov', 'sidorov@company.com', 'Петр Сидоров', 'Отдел продаж', '+7(999)777-88-99'],
        ['smirnova', 'smirnova@company.com', 'Анна Смирнова', 'HR-отдел', '+7(999)000-11-22']
      ];
      
      const userStmt = db.prepare(`
        INSERT INTO users (username, email, full_name, department, phone) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      users.forEach(user => {
        userStmt.run(user);
      });
      userStmt.finalize();
      
      // Техника
      const equipment = [
        ['EQ-001', 'Ноутбук', 'MacBook Pro 14"', 'C02ZR0L5MD6P', 'Apple', '2023-01-15', '2026-01-15', 'available', 'M2 Pro, 16GB RAM, 512GB SSD'],
        ['EQ-002', 'Ноутбук', 'Dell XPS 15', 'ABC123XYZ', 'Dell', '2023-03-20', '2026-03-20', 'assigned', 'i7-12700H, 32GB RAM, 1TB SSD'],
        ['EQ-003', 'Монитор', 'LG UltraFine 27"', 'LG-27-001', 'LG', '2023-02-10', '2026-02-10', 'available', '4K, USB-C'],
        ['EQ-004', 'Клавиатура', 'Logitech MX Keys', 'MX-12345', 'Logitech', '2023-04-01', '2026-04-01', 'assigned', 'Беспроводная, подсветка'],
        ['EQ-005', 'Мышь', 'Logitech MX Master 3', 'MX-67890', 'Logitech', '2023-04-01', '2026-04-01', 'available', 'Беспроводная, эргономичная'],
        ['EQ-006', 'Принтер', 'HP LaserJet Pro', 'HP-001', 'HP', '2022-11-01', '2025-11-01', 'available', 'Черно-белый, двусторонняя печать']
      ];
      
      const eqStmt = db.prepare(`
        INSERT INTO equipment (inventory_number, name, model, serial_number, manufacturer, purchase_date, warranty_until, status, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      equipment.forEach(eq => {
        eqStmt.run(eq);
      });
      eqStmt.finalize(() => {
        // Сопоставления
        setTimeout(() => {
          db.all('SELECT id, username FROM users', (err, usersRows) => {
            if (err) {
              reject(err);
              return;
            }
            
            db.all('SELECT id, inventory_number FROM equipment', (err, eqRows) => {
              if (err) {
                reject(err);
                return;
              }
              
              const userMap = {};
              usersRows.forEach(user => {
                userMap[user.username] = user.id;
              });
              
              const eqMap = {};
              eqRows.forEach(eq => {
                eqMap[eq.inventory_number] = eq.id;
              });
              
              const assignments = [
                { username: 'petrova', inventory: 'EQ-002', condition: 'Новый ноутбук' },
                { username: 'petrova', inventory: 'EQ-004', condition: 'Новая клавиатура' },
                { username: 'sidorov', inventory: 'EQ-005', condition: 'Новая мышь' }
              ];
              
              const assignStmt = db.prepare(`
                INSERT INTO user_equipment (user_id, equipment_id, assigned_date, condition_on_assign, notes) 
                VALUES (?, ?, ?, ?, ?)
              `);
              
              assignments.forEach(assign => {
                const userId = userMap[assign.username];
                const eqId = eqMap[assign.inventory];
                
                if (userId && eqId) {
                  assignStmt.run([userId, eqId, new Date().toISOString(), assign.condition, '']);
                }
              });
              assignStmt.finalize(() => {
                console.log('✅ Тестовые данные добавлены');
                resolve();
              });
            });
          });
        }, 200);
      });
    });
  });
}

// ===== ФУНКЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users ORDER BY full_name', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function addUser(userData) {
  return new Promise((resolve, reject) => {
    const { username, email, full_name, department, phone } = userData;
    db.run(
      'INSERT INTO users (username, email, full_name, department, phone) VALUES (?, ?, ?, ?, ?)',
      [username, email, full_name, department, phone],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, ...userData });
      }
    );
  });
}

function updateUser(id, userData) {
  return new Promise((resolve, reject) => {
    const { username, email, full_name, department, phone } = userData;
    db.run(
      `UPDATE users 
       SET username = ?, email = ?, full_name = ?, department = ?, phone = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [username, email, full_name, department, phone, id],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Пользователь не найден'));
          return;
        }
        resolve({ id, ...userData });
      }
    );
  });
}

function deleteUser(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ deleted: this.changes });
    });
  });
}

function getUsersWithEquipment() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        u.*,
        GROUP_CONCAT(
          e.name || ' (' || e.inventory_number || ')', 
          ', '
        ) as equipment_list,
        COUNT(ue.id) as equipment_count
      FROM users u
      LEFT JOIN user_equipment ue ON u.id = ue.user_id AND ue.returned_date IS NULL
      LEFT JOIN equipment e ON ue.equipment_id = e.id
      GROUP BY u.id
      ORDER BY u.full_name
    `, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// ===== ФУНКЦИИ ДЛЯ ТЕХНИКИ =====

function getAllEquipment() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM equipment ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getEquipmentById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM equipment WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function getEquipmentByInventory(inventoryNumber) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM equipment WHERE inventory_number = ?', [inventoryNumber], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function addEquipment(eqData) {
  return new Promise((resolve, reject) => {
    const { 
      inventory_number, name, model, serial_number, 
      manufacturer, purchase_date, warranty_until, 
      status, description 
    } = eqData;
    
    db.run(
      `INSERT INTO equipment 
       (inventory_number, name, model, serial_number, manufacturer, 
        purchase_date, warranty_until, status, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inventory_number, name, model, serial_number, manufacturer, 
       purchase_date, warranty_until, status || 'available', description],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, ...eqData });
      }
    );
  });
}

function updateEquipment(id, eqData) {
  return new Promise((resolve, reject) => {
    // Проверяем ID
    if (!id || isNaN(id)) {
      console.error('❌ Неверный ID для обновления:', id);
      reject(new Error('Неверный ID техники'));
      return;
    }
    
    const idNum = parseInt(id);
    const { 
      inventory_number, name, model, serial_number, 
      manufacturer, purchase_date, warranty_until, 
      status, description 
    } = eqData;
    
    console.log(`🔄 Обновление техники ID: ${idNum}, новый статус: ${status}`);
    
    // Сначала проверяем, существует ли техника
    db.get('SELECT * FROM equipment WHERE id = ?', [idNum], (err, equipment) => {
      if (err) {
        console.error('❌ Ошибка при проверке техники:', err);
        reject(err);
        return;
      }
      
      if (!equipment) {
        console.error(`❌ Техника с ID ${idNum} не найдена`);
        reject(new Error('Техника не найдена'));
        return;
      }
      
      const oldStatus = equipment.status;
      console.log(`📊 Текущий статус: ${oldStatus}, новый статус: ${status}`);
      
      // Если статус меняется с 'assigned' на 'available', возвращаем технику
      if (oldStatus === 'assigned' && status === 'available') {
        console.log(`🔄 Возврат техники ID: ${idNum} от пользователя`);
        
        // Находим активное назначение
        db.get(
          `SELECT id, user_id FROM user_equipment 
           WHERE equipment_id = ? AND returned_date IS NULL`,
          [idNum],
          (err, assignment) => {
            if (err) {
              console.error('❌ Ошибка при поиске назначения:', err);
              // Продолжаем обновление даже при ошибке
            }
            
            // Обновляем технику
            db.run(
              `UPDATE equipment 
               SET inventory_number = ?, name = ?, model = ?, serial_number = ?, 
                   manufacturer = ?, purchase_date = ?, warranty_until = ?, 
                   status = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [inventory_number, name, model, serial_number, 
               manufacturer, purchase_date, warranty_until, 
               status, description, idNum],
              function(err) {
                if (err) {
                  console.error('❌ Ошибка обновления техники:', err);
                  reject(err);
                  return;
                }
                
                if (this.changes === 0) {
                  console.error(`❌ Техника с ID ${idNum} не найдена при обновлении`);
                  reject(new Error('Техника не найдена'));
                  return;
                }
                
                // Если есть активное назначение, возвращаем технику
                if (assignment) {
                  console.log(`✅ Возврат техники от пользователя ${assignment.user_id}`);
                  db.run(
                    `UPDATE user_equipment 
                     SET returned_date = CURRENT_TIMESTAMP, 
                         condition_on_return = ?
                     WHERE id = ?`,
                    ['Возвращена при изменении статуса', assignment.id],
                    function(err) {
                      if (err) {
                        console.error('❌ Ошибка при возврате техники:', err);
                        // Не блокируем основное обновление
                      }
                      resolve({ id: idNum, ...eqData, returned: true });
                    }
                  );
                } else {
                  resolve({ id: idNum, ...eqData, returned: false });
                }
              }
            );
          }
        );
      } else {
        // Обычное обновление без возврата
        console.log(`📝 Обычное обновление техники ID: ${idNum}`);
        db.run(
          `UPDATE equipment 
           SET inventory_number = ?, name = ?, model = ?, serial_number = ?, 
               manufacturer = ?, purchase_date = ?, warranty_until = ?, 
               status = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [inventory_number, name, model, serial_number, 
           manufacturer, purchase_date, warranty_until, 
           status, description, idNum],
          function(err) {
            if (err) {
              console.error('❌ Ошибка обновления техники:', err);
              reject(err);
              return;
            }
            
            if (this.changes === 0) {
              console.error(`❌ Техника с ID ${idNum} не найдена при обновлении`);
              reject(new Error('Техника не найдена'));
              return;
            }
            
            console.log(`✅ Техника ID: ${idNum} успешно обновлена`);
            resolve({ id: idNum, ...eqData, returned: false });
          }
        );
      }
    });
  });
}

function deleteEquipment(id) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM user_equipment WHERE equipment_id = ? AND returned_date IS NULL',
      [id],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row) {
          reject(new Error('Невозможно удалить технику, она назначена пользователю'));
          return;
        }
        
        db.run('DELETE FROM equipment WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ deleted: this.changes });
        });
      }
    );
  });
}

// ===== ФУНКЦИИ ДЛЯ СОПОСТАВЛЕНИЙ =====

function assignEquipment(userId, equipmentId, condition, notes = '') {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      if (!user) {
        reject(new Error('Пользователь не найден'));
        return;
      }
      
      db.get('SELECT id, status FROM equipment WHERE id = ?', [equipmentId], (err, eq) => {
        if (err) {
          reject(err);
          return;
        }
        if (!eq) {
          reject(new Error('Техника не найдена'));
          return;
        }
        if (eq.status !== 'available') {
          reject(new Error(`Техника уже ${eq.status === 'assigned' ? 'назначена' : 'в ремонте'}`));
          return;
        }
        
        db.run(
          `INSERT INTO user_equipment (user_id, equipment_id, condition_on_assign, notes) 
           VALUES (?, ?, ?, ?)`,
          [userId, equipmentId, condition || 'В хорошем состоянии', notes],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            db.run(
              'UPDATE equipment SET status = "assigned", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [equipmentId],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({ 
                  assignment_id: this.lastID, 
                  user_id: userId, 
                  equipment_id: equipmentId 
                });
              }
            );
          }
        );
      });
    });
  });
}

function returnEquipment(equipmentId, condition, notes = '') {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, user_id FROM user_equipment 
       WHERE equipment_id = ? AND returned_date IS NULL`,
      [equipmentId],
      (err, assignment) => {
        if (err) {
          reject(err);
          return;
        }
        if (!assignment) {
          reject(new Error('Активное назначение не найдено'));
          return;
        }
        
        db.run(
          `UPDATE user_equipment 
           SET returned_date = CURRENT_TIMESTAMP, 
               condition_on_return = ?
           WHERE id = ?`,
          [condition || 'В хорошем состоянии', assignment.id],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            db.run(
              'UPDATE equipment SET status = "available", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [equipmentId],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({ 
                  assignment_id: assignment.id, 
                  equipment_id: equipmentId,
                  returned: true 
                });
              }
            );
          }
        );
      }
    );
  });
}

function returnEquipmentByEquipmentId(equipmentId, condition = 'В хорошем состоянии', notes = '') {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, user_id FROM user_equipment 
       WHERE equipment_id = ? AND returned_date IS NULL`,
      [equipmentId],
      (err, assignment) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!assignment) {
          resolve({ success: false, message: 'Активное назначение не найдено' });
          return;
        }
        
        db.run(
          `UPDATE user_equipment 
           SET returned_date = CURRENT_TIMESTAMP, 
               condition_on_return = ?
           WHERE id = ?`,
          [condition, assignment.id],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            db.run(
              'UPDATE equipment SET status = "available", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [equipmentId],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({ 
                  success: true, 
                  assignment_id: assignment.id, 
                  user_id: assignment.user_id,
                  equipment_id: equipmentId 
                });
              }
            );
          }
        );
      }
    );
  });
}

function getEquipmentWithUsers() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        e.*,
        u.id as user_id,
        u.full_name as user_name,
        u.department as user_department,
        ue.assigned_date,
        ue.condition_on_assign,
        ue.notes as assignment_notes,
        CASE 
          WHEN ue.returned_date IS NULL AND e.status = 'assigned' THEN 'active'
          WHEN ue.returned_date IS NOT NULL THEN 'returned'
          ELSE 'available'
        END as assignment_status
      FROM equipment e
      LEFT JOIN user_equipment ue ON e.id = ue.equipment_id AND ue.returned_date IS NULL
      LEFT JOIN users u ON ue.user_id = u.id
      ORDER BY e.name
    `, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getUserEquipment(userId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        e.*,
        ue.assigned_date,
        ue.condition_on_assign,
        ue.notes,
        ue.returned_date,
        CASE 
          WHEN ue.returned_date IS NULL THEN 'active'
          ELSE 'returned'
        END as assignment_status
      FROM user_equipment ue
      JOIN equipment e ON ue.equipment_id = e.id
      WHERE ue.user_id = ?
      ORDER BY ue.assigned_date DESC
    `, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getAvailableEquipment() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM equipment WHERE status = "available" ORDER BY name',
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

function getEquipmentHistory(equipmentId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ue.*,
        u.full_name as user_name,
        u.department as user_department
      FROM user_equipment ue
      JOIN users u ON ue.user_id = u.id
      WHERE ue.equipment_id = ?
      ORDER BY ue.assigned_date DESC
    `, [equipmentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// ===== СТАТИСТИКА =====

function getStats() {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM equipment) as total_equipment,
        (SELECT COUNT(*) FROM equipment WHERE status = 'available') as available_equipment,
        (SELECT COUNT(*) FROM equipment WHERE status = 'assigned') as assigned_equipment,
        (SELECT COUNT(*) FROM equipment WHERE status = 'maintenance') as maintenance_equipment,
        (SELECT COUNT(*) FROM equipment WHERE status = 'retired') as retired_equipment,
        (SELECT COUNT(*) FROM user_equipment WHERE returned_date IS NULL) as active_assignments
    `, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function checkDataIntegrity() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ue.id,
        ue.user_id,
        ue.equipment_id,
        u.username,
        e.inventory_number
      FROM user_equipment ue
      LEFT JOIN users u ON ue.user_id = u.id
      LEFT JOIN equipment e ON ue.equipment_id = e.id
      WHERE u.id IS NULL OR e.id IS NULL
    `, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function closeDatabase() {
  return new Promise((resolve) => {
    db.close(() => {
      resolve();
    });
  });
}

// ===== ФУНКЦИИ ДЛЯ АВТОРИЗАЦИИ =====

/**
 * Получить пользователя по логину (включая пароль)
 */
function getUserByUsernameWithPassword(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Получить пользователя по email (включая пароль)
 */
function getUserByEmailWithPassword(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Обновить пароль пользователя
 */
function updateUserPassword(userId, passwordHash, mustChange = 0) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users 
       SET password_hash = ?, must_change_password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [passwordHash, mustChange, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      }
    );
  });
}

/**
 * Обновить время последнего входа
 */
function updateLastLogin(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      }
    );
  });
}

/**
 * Изменить активность пользователя (блокировка/разблокировка)
 */
function setUserActive(userId, isActive) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      }
    );
  });
}

/**
 * Изменить роль пользователя
 */
function setUserRole(userId, role) {
  return new Promise((resolve, reject) => {
    if (!['admin', 'user'].includes(role)) {
      reject(new Error('Недопустимая роль'));
      return;
    }
    
    db.run(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      }
    );
  });
}
// ===== ФУНКЦИИ ДЛЯ ЛИЧНОГО КАБИНЕТА =====

/**
 * Получить активную технику пользователя (только выданную, не возвращённую)
 */
function getUserActiveEquipment(userId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        e.id,
        e.inventory_number,
        e.name,
        e.model,
        e.serial_number,
        e.manufacturer,
        e.description,
        ue.assigned_date,
        ue.condition_on_assign,
        ue.notes,
        ue.id as assignment_id
      FROM user_equipment ue
      JOIN equipment e ON ue.equipment_id = e.id
      WHERE ue.user_id = ? AND ue.returned_date IS NULL
      ORDER BY ue.assigned_date DESC
    `, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Получить всю историю техники пользователя (включая возвращённую)
 */
function getUserEquipmentHistory(userId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        e.id,
        e.inventory_number,
        e.name,
        e.model,
        e.manufacturer,
        ue.assigned_date,
        ue.returned_date,
        ue.condition_on_assign,
        ue.condition_on_return,
        ue.notes,
        CASE 
          WHEN ue.returned_date IS NULL THEN 'active'
          ELSE 'returned'
        END as status
      FROM user_equipment ue
      JOIN equipment e ON ue.equipment_id = e.id
      WHERE ue.user_id = ?
      ORDER BY ue.assigned_date DESC
    `, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Обновить профиль пользователя (без пароля)
 */
function updateUserProfile(userId, data) {
  return new Promise((resolve, reject) => {
    const { email, full_name, department, phone } = data;
    
    db.run(
      `UPDATE users 
       SET email = ?, full_name = ?, department = ?, phone = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [email, full_name, department, phone, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Пользователь не найден'));
          return;
        }
        resolve({ id: userId, ...data });
      }
    );
  });
}

/**
 * Получить статистику пользователя
 */
function getUserStats(userId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = ? AND returned_date IS NULL) as active_equipment,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = ?) as total_equipment,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = ? AND returned_date IS NOT NULL) as returned_equipment
    `, [userId, userId, userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// ===== ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ =====

/**
 * Создать пользователя с паролем
 */
function createUserWithPassword(userData) {
  return new Promise((resolve, reject) => {
    const { 
      username, email, full_name, department, phone, 
      password_hash, role = 'user', must_change_password = 1 
    } = userData;
    
    db.run(
      `INSERT INTO users 
       (username, email, full_name, department, phone, password_hash, role, is_active, must_change_password) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [username, email, full_name, department, phone, password_hash, role, must_change_password],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, ...userData });
      }
    );
  });
}

/**
 * Получить пользователя с расширенной информацией (включая количество техники)
 */
function getUserWithDetails(userId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = u.id AND returned_date IS NULL) as active_equipment_count,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = u.id) as total_equipment_count
      FROM users u
      WHERE u.id = ?
    `, [userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Получить всех пользователей с расширенной информацией
 */
function getAllUsersWithDetails() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.department,
        u.phone,
        u.role,
        u.is_active,
        u.must_change_password,
        u.last_login,
        u.created_at,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = u.id AND returned_date IS NULL) as active_equipment_count,
        (SELECT COUNT(*) FROM user_equipment WHERE user_id = u.id) as total_equipment_count
      FROM users u
      ORDER BY u.is_active DESC, u.full_name ASC
    `, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Проверить, существует ли пользователь с таким логином или email
 */
function checkUserExists(username, email, excludeId = null) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT id, username, email FROM users WHERE (username = ? OR email = ?)';
    const params = [username, email];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Удалить пользователя и вернуть всю его технику
 * Используем транзакцию для атомарности
 */
function deleteUserWithEquipmentReturn(userId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // 1. Находим всю активную технику пользователя
      db.all(
        `SELECT equipment_id FROM user_equipment 
         WHERE user_id = ? AND returned_date IS NULL`,
        [userId],
        (err, rows) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          const equipmentIds = rows.map(r => r.equipment_id);
          
          // 2. Возвращаем технику (устанавливаем returned_date)
          db.run(
            `UPDATE user_equipment 
             SET returned_date = CURRENT_TIMESTAMP, 
                 condition_on_return = 'Возвращена при удалении пользователя',
                 notes = COALESCE(notes, '') || ' | Автовозврат при удалении пользователя'
             WHERE user_id = ? AND returned_date IS NULL`,
            [userId],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // 3. Обновляем статус техники на available
              if (equipmentIds.length > 0) {
                const placeholders = equipmentIds.map(() => '?').join(',');
                db.run(
                  `UPDATE equipment 
                   SET status = 'available', updated_at = CURRENT_TIMESTAMP 
                   WHERE id IN (${placeholders})`,
                  equipmentIds,
                  function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    
                    // 4. Удаляем пользователя
                    db.run(
                      'DELETE FROM users WHERE id = ?',
                      [userId],
                      function(err) {
                        if (err) {
                          db.run('ROLLBACK');
                          reject(err);
                          return;
                        }
                        
                        db.run('COMMIT', (err) => {
                          if (err) {
                            reject(err);
                            return;
                          }
                          
                          resolve({
                            deleted: this.changes,
                            equipment_returned: equipmentIds.length
                          });
                        });
                      }
                    );
                  }
                );
              } else {
                // Нет активной техники — просто удаляем
                db.run(
                  'DELETE FROM users WHERE id = ?',
                  [userId],
                  function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    
                    db.run('COMMIT', (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      
                      resolve({
                        deleted: this.changes,
                        equipment_returned: 0
                      });
                    });
                  }
                );
              }
            }
          );
        }
      );
    });
  });
}

/**
 * Получить всех пользователей, у которых есть техника (для страницы "кто что держит")
 */
function getUsersWithActiveEquipment() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.department,
        u.role,
        COUNT(ue.id) as equipment_count,
        GROUP_CONCAT(
          e.inventory_number || ' ' || e.name, 
          ' | '
        ) as equipment_list
      FROM users u
      JOIN user_equipment ue ON u.id = ue.user_id AND ue.returned_date IS NULL
      JOIN equipment e ON ue.equipment_id = e.id
      GROUP BY u.id
      ORDER BY equipment_count DESC, u.full_name ASC
    `, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ЛОГАМИ =====

/**
 * Получить логи с фильтрами и пагинацией
 */
function getActivityLogs(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        al.*,
        u.full_name as user_full_name,
        u.department as user_department
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.userId) {
      sql += ' AND al.user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      sql += ' AND al.action = ?';
      params.push(filters.action);
    }
    
    if (filters.actionLike) {
      sql += ' AND al.action LIKE ?';
      params.push(`%${filters.actionLike}%`);
    }
    
    if (filters.entityType) {
      sql += ' AND al.entity_type = ?';
      params.push(filters.entityType);
    }
    
    if (filters.dateFrom) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.dateTo);
    }
    
    if (filters.search) {
      sql += ' AND (al.username LIKE ? OR al.details LIKE ? OR u.full_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY al.created_at DESC';
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Получить общее количество логов с учётом фильтров
 */
function getActivityLogsCount(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT COUNT(*) as total
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.userId) {
      sql += ' AND al.user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      sql += ' AND al.action = ?';
      params.push(filters.action);
    }
    
    if (filters.actionLike) {
      sql += ' AND al.action LIKE ?';
      params.push(`%${filters.actionLike}%`);
    }
    
    if (filters.entityType) {
      sql += ' AND al.entity_type = ?';
      params.push(filters.entityType);
    }
    
    if (filters.dateFrom) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.dateTo);
    }
    
    if (filters.search) {
      sql += ' AND (al.username LIKE ? OR al.details LIKE ? OR u.full_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? row.total : 0);
    });
  });
}

/**
 * Получить список уникальных действий (для фильтра)
 */
function getUniqueActions() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT action, COUNT(*) as count 
       FROM activity_log 
       GROUP BY action 
       ORDER BY count DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

/**
 * Получить статистику логов за период
 */
function getActivityStats(days = 30) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins,
        SUM(CASE WHEN action = 'login_failed' THEN 1 ELSE 0 END) as failed_logins,
        SUM(CASE WHEN action LIKE 'equipment_%' THEN 1 ELSE 0 END) as equipment_actions,
        SUM(CASE WHEN action LIKE 'user_%' THEN 1 ELSE 0 END) as user_actions,
        SUM(CASE WHEN action LIKE '%_delete' THEN 1 ELSE 0 END) as deletes
      FROM activity_log
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `, [days], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || {});
    });
  });
}

/**
 * Получить активность по дням (для графика)
 */
function getActivityByDay(days = 14) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_log
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Очистить логи старше N дней
 */
function cleanOldLogs(days = 90) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM activity_log WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ deleted: this.changes });
      }
    );
  });
}

// ===== ЭКСПОРТЫ =====

module.exports = {
  db,
  initDatabase,
  // Users
  getAllUsers,
  getUserById,
  getUserByUsername,
  addUser,
  updateUser,
  deleteUser,
  getUsersWithEquipment,
  // Equipment
  getAllEquipment,
  getEquipmentById,
  getEquipmentByInventory,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  // Assignments
  assignEquipment,
  returnEquipment,
  returnEquipmentByEquipmentId,
  getEquipmentWithUsers,
  getUserEquipment,
  getAvailableEquipment,
  getEquipmentHistory,
  // Stats
  getStats,
  checkDataIntegrity,
  closeDatabase,
  // Auth
  getUserByUsernameWithPassword,
  getUserByEmailWithPassword,
  updateUserPassword,
  updateLastLogin,
  setUserActive,
  setUserRole,
    // Profile
  getUserActiveEquipment,
  getUserEquipmentHistory,
  updateUserProfile,
  getUserStats,
    // Управление пользователями
  createUserWithPassword,
  getUserWithDetails,
  getAllUsersWithDetails,
  checkUserExists,
  deleteUserWithEquipmentReturn,
  getUsersWithActiveEquipment,
    // Логи
  getActivityLogs,
  getActivityLogsCount,
  getUniqueActions,
  getActivityStats,
  getActivityByDay,
  cleanOldLogs
};