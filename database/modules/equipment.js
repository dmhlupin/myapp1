// database/modules/equipment.js
// Работа с техникой: CRUD + назначения + место хранения

module.exports = ({ db, run, get, all }) => ({
  
  // ============================================================
  // CRUD ТЕХНИКИ
  // ============================================================
  
  /**
   * Получить всю технику с названиями категорий и типов
   */
  getAllEquipment() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          e.*,
          c.name as category_name,
          c.icon as category_icon,
          t.name as type_name,
          t.icon as type_icon
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        LEFT JOIN equipment_types t ON e.type_id = t.id
        ORDER BY e.name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  /**
   * Получить технику по ID (с полным адресом хранения)
   */
  getEquipmentById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          e.*,
          c.name as category_name,
          c.icon as category_icon,
          t.name as type_name,
          t.icon as type_icon,
          cell.name as cell_name,
          cell.code as cell_code,
          rack.name as rack_name,
          zone.name as zone_name,
          wh.id as warehouse_id,
          wh.name as warehouse_name,
          wp.id as workplace_id,
          wp.name as workplace_name,
          wp.code as workplace_code,
          r.id as room_id,
          r.name as room_name,
          o.id as office_id,
          o.name as office_name
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        LEFT JOIN equipment_types t ON e.type_id = t.id
        LEFT JOIN cells cell ON e.cell_id = cell.id
        LEFT JOIN racks rack ON cell.rack_id = rack.id
        LEFT JOIN zones zone ON rack.zone_id = zone.id
        LEFT JOIN warehouses wh ON zone.warehouse_id = wh.id
        LEFT JOIN workplaces wp ON e.workplace_id = wp.id
        LEFT JOIN rooms r ON wp.room_id = r.id
        LEFT JOIN offices o ON r.office_id = o.id
        WHERE e.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  /**
   * Добавить технику
   */
  addEquipment(eqData) {
    return new Promise((resolve, reject) => {
      const { 
        inventory_number, name, model, serial_number, 
        manufacturer, purchase_date, warranty_until, 
        status, description, category_id, type_id, cell_id 
      } = eqData;
      
      db.run(`
        INSERT INTO equipment 
        (inventory_number, name, model, serial_number, manufacturer, 
         purchase_date, warranty_until, status, description, category_id, type_id, cell_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inventory_number, name, model, serial_number, manufacturer, 
        purchase_date, warranty_until, status || 'available', description,
        category_id || null, type_id || null, cell_id || null
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, ...eqData });
      });
    });
  },
  
  /**
   * Обновить технику
   * С автоматическим возвратом при смене статуса assigned → available
   */
  updateEquipment(id, eqData) {
    return new Promise((resolve, reject) => {
      // Проверяем ID
      if (!id || isNaN(id)) {
        reject(new Error('Неверный ID техники'));
        return;
      }
      
      const idNum = parseInt(id);
      const { 
        inventory_number, name, model, serial_number, 
        manufacturer, purchase_date, warranty_until, 
        status, description, category_id, type_id, cell_id, workplace_id 
      } = eqData;
      
      // Проверяем, существует ли техника
      db.get('SELECT * FROM equipment WHERE id = ?', [idNum], (err, equipment) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!equipment) {
          reject(new Error('Техника не найдена'));
          return;
        }
        
        const oldStatus = equipment.status;
        
        // Если статус меняется с assigned на available — возвращаем технику
        if (oldStatus === 'assigned' && status === 'available') {
          db.get(
            `SELECT id, user_id FROM user_equipment 
             WHERE equipment_id = ? AND returned_date IS NULL`,
            [idNum],
            (err, assignment) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Обновляем технику — обнуляем cell_id (техника на складе, но без адреса)
              db.run(`
                UPDATE equipment 
                SET inventory_number = ?, name = ?, model = ?, serial_number = ?, 
                    manufacturer = ?, purchase_date = ?, warranty_until = ?, 
                    status = ?, description = ?, 
                    category_id = ?, type_id = ?, 
                    cell_id = NULL,
                    workplace_id = NULL,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `, [
                inventory_number, name, model, serial_number, 
                manufacturer, purchase_date, warranty_until, 
                status, description, 
                category_id || null, type_id || null,
                idNum
              ], function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                
                if (this.changes === 0) {
                  reject(new Error('Техника не найдена'));
                  return;
                }
                
                // Если есть активное назначение, закрываем его
                if (assignment) {
                  db.run(`
                    UPDATE user_equipment 
                    SET returned_date = CURRENT_TIMESTAMP, 
                        condition_on_return = ?
                    WHERE id = ?
                  `, ['Возвращена при изменении статуса', assignment.id], (err) => {
                    if (err) {
                      console.error('Ошибка при возврате техники:', err.message);
                    }
                    resolve({ id: idNum, ...eqData, returned: true });
                  });
                } else {
                  resolve({ id: idNum, ...eqData, returned: false });
                }
              });
            }
          );
        } else {
          // Обычное обновление
          db.run(`
            UPDATE equipment 
            SET inventory_number = ?, name = ?, model = ?, serial_number = ?, 
                manufacturer = ?, purchase_date = ?, warranty_until = ?, 
                status = ?, description = ?, 
                category_id = ?, type_id = ?, cell_id = ?, workplace_id = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [
            inventory_number, name, model, serial_number, 
            manufacturer, purchase_date, warranty_until, 
            status, description, 
            category_id || null, type_id || null, cell_id || null, workplace_id || null,
            idNum
          ], function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            if (this.changes === 0) {
              reject(new Error('Техника не найдена'));
              return;
            }
            
            resolve({ id: idNum, ...eqData, returned: false });
          });
        }
      });
    });
  },
  
  /**
   * Удалить технику
   * Нельзя удалить, если она назначена пользователю
   */
  deleteEquipment(id) {
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
  },
  
  // ============================================================
  // ПОЛУЧЕНИЕ С ИНФОРМАЦИЕЙ О ПОЛЬЗОВАТЕЛЯХ
  // ============================================================
  
  /**
   * Получить технику с информацией о текущем владельце
   * (базовая версия, без места хранения)
   */
  getEquipmentWithUsers() {
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
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  /**
   * Получить технику с полным адресом хранения
   * Поддерживает фильтры: category_id, type_id, status, search, warehouse_id + пагинацию
   */
  getEquipmentWithLocation(filters = {}) {
    return new Promise((resolve, reject) => {
      const {
        category_id = null,
        type_id = null,
        status = null,
        search = null,
        warehouse_id = null,
        limit = null,
        offset = 0,
        include_total = false,
      } = filters;
      
      let sql = `
        SELECT 
          e.id,
          e.inventory_number,
          e.name,
          e.model,
          e.serial_number,
          e.manufacturer,
          e.status,
          e.category_id,
          e.type_id,
          e.cell_id,
          e.workplace_id,
          c.name as category_name,
          c.icon as category_icon,
          t.name as type_name,
          t.icon as type_icon,
          u.id as user_id,
          u.full_name as user_name,
          u.department as user_department,
          ue.assigned_date,
          ue.condition_on_assign,
          cell.name as cell_name,
          cell.code as cell_code,
          rack.name as rack_name,
          zone.name as zone_name,
          wh.id as warehouse_id,
          wh.name as warehouse_name
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        LEFT JOIN equipment_types t ON e.type_id = t.id
        LEFT JOIN user_equipment ue ON e.id = ue.equipment_id AND ue.returned_date IS NULL
        LEFT JOIN users u ON ue.user_id = u.id
        LEFT JOIN cells cell ON e.cell_id = cell.id
        LEFT JOIN racks rack ON cell.rack_id = rack.id
        LEFT JOIN zones zone ON rack.zone_id = zone.id
        LEFT JOIN warehouses wh ON zone.warehouse_id = wh.id
        WHERE 1=1
      `;
      const params = [];
      
      if (category_id) {
        sql += ' AND e.category_id = ?';
        params.push(category_id);
      }
      
      if (type_id) {
        sql += ' AND e.type_id = ?';
        params.push(type_id);
      }
      
      if (status) {
        sql += ' AND e.status = ?';
        params.push(status);
      }
      
      if (warehouse_id) {
        sql += ' AND wh.id = ?';
        params.push(warehouse_id);
      }
      
      if (search) {
        sql += ` AND (
          e.inventory_number LIKE ? OR 
          e.name LIKE ? OR 
          e.model LIKE ? OR 
          e.serial_number LIKE ? OR
          u.full_name LIKE ? OR
          u.username LIKE ? OR
          cell.code LIKE ?
        )`;
        const term = `%${search}%`;
        params.push(term, term, term, term, term, term, term);
      }
      
      sql += ' ORDER BY e.inventory_number ASC';
      
      if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }
      
      if (include_total) {
        let countSql = `
          SELECT COUNT(*) as total
          FROM equipment e
          LEFT JOIN user_equipment ue ON e.id = ue.equipment_id AND ue.returned_date IS NULL
          LEFT JOIN users u ON ue.user_id = u.id
          LEFT JOIN cells cell ON e.cell_id = cell.id
          LEFT JOIN racks rack ON cell.rack_id = rack.id
          LEFT JOIN zones zone ON rack.zone_id = zone.id
          LEFT JOIN warehouses wh ON zone.warehouse_id = wh.id
          WHERE 1=1
        `;
        const countParams = [];
        
        if (category_id) {
          countSql += ' AND e.category_id = ?';
          countParams.push(category_id);
        }
        if (type_id) {
          countSql += ' AND e.type_id = ?';
          countParams.push(type_id);
        }
        if (status) {
          countSql += ' AND e.status = ?';
          countParams.push(status);
        }
        if (warehouse_id) {
          countSql += ' AND wh.id = ?';
          countParams.push(warehouse_id);
        }
        if (search) {
          countSql += ` AND (
            e.inventory_number LIKE ? OR 
            e.name LIKE ? OR 
            e.model LIKE ? OR 
            e.serial_number LIKE ? OR
            u.full_name LIKE ? OR
            u.username LIKE ? OR
            cell.code LIKE ?
          )`;
          const term = `%${search}%`;
          countParams.push(term, term, term, term, term, term, term);
        }
        
        db.get(countSql, countParams, (err, countRow) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.all(sql, params, (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({
              items: rows || [],
              total: countRow ? countRow.total : 0,
              limit: limit,
              offset: offset,
            });
          });
        });
      } else {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }
    });
  },
  
  /**
   * Получить историю назначений техники
   */
  getEquipmentHistory(equipmentId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          ue.id,
          ue.user_id,
          ue.equipment_id,
          ue.assigned_date,
          ue.returned_date,
          ue.condition_on_assign,
          ue.condition_on_return,
          ue.notes,
          u.username,
          u.full_name,
          u.department,
          u.email,
          CASE 
            WHEN ue.returned_date IS NULL THEN 'active'
            ELSE 'returned'
          END as status
        FROM user_equipment ue
        JOIN users u ON ue.user_id = u.id
        WHERE ue.equipment_id = ?
        ORDER BY ue.id DESC
      `, [equipmentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  // ============================================================
  // НАЗНАЧЕНИЯ
  // ============================================================
  
  /**
   * Назначить технику пользователю
   * Автоматически закрывает предыдущее активное назначение
   * Обнуляет cell_id (техника у пользователя)
   */
  assignEquipment(userId, equipmentId, condition, notes = '') {
    return new Promise((resolve, reject) => {
      // Проверяем пользователя
      db.get('SELECT id, is_active FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        if (!user) {
          reject(new Error('Пользователь не найден'));
          return;
        }
        if (!user.is_active) {
          reject(new Error('Пользователь заблокирован'));
          return;
        }
        
        // Проверяем технику
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
            reject(new Error(`Техника не может быть назначена (текущий статус: ${eq.status})`));
            return;
          }
          
          // Проверяем активные назначения
          db.get(
            `SELECT id, user_id FROM user_equipment 
             WHERE equipment_id = ? AND returned_date IS NULL`,
            [equipmentId],
            (err, activeAssignment) => {
              if (err) {
                reject(err);
                return;
              }
              
              const createNewAssignment = () => {
                db.run(`
                  INSERT INTO user_equipment 
                  (user_id, equipment_id, condition_on_assign, notes) 
                  VALUES (?, ?, ?, ?)
                `, [userId, equipmentId, condition || 'В хорошем состоянии', notes], function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  const assignmentId = this.lastID;
                  
                  // 🆕 Обнуляем cell_id — техника у пользователя
                  db.run(`
                    UPDATE equipment 
                    SET status = 'assigned', 
                        cell_id = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                  `, [equipmentId], function(err) {
                    if (err) {
                      reject(err);
                      return;
                    }
                    resolve({ 
                      assignment_id: assignmentId, 
                      user_id: userId, 
                      equipment_id: equipmentId,
                      previous_returned: false
                    });
                  });
                });
              };
              
              // Если есть активное назначение — закрываем перед новым
              if (activeAssignment) {
                db.run(`
                  UPDATE user_equipment 
                  SET returned_date = CURRENT_TIMESTAMP, 
                      condition_on_return = 'Автовозврат: переназначение',
                      notes = COALESCE(notes, '') || ' | Автовозврат при переназначении'
                  WHERE id = ?
                `, [activeAssignment.id], (err) => {
                  if (err) {
                    console.error('Ошибка закрытия старого назначения:', err.message);
                  }
                  createNewAssignment();
                });
              } else {
                createNewAssignment();
              }
            }
          );
        });
      });
    });
  },
  
  /**
   * Вернуть технику по equipmentId
   * Устанавливает returned_date, меняет статус на available и обнуляет cell_id
   */
  returnEquipmentByEquipmentId(equipmentId, condition = 'В хорошем состоянии', notes = '') {
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
          
          db.run(`
            UPDATE user_equipment 
            SET returned_date = CURRENT_TIMESTAMP, 
                condition_on_return = ?,
                notes = COALESCE(notes, '') || CASE WHEN ? != '' THEN ' | ' || ? ELSE '' END
            WHERE id = ?
          `, [condition, notes, notes, assignment.id], function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            // 🆕 Обнуляем cell_id — техника на складе, но без адреса
            db.run(`
              UPDATE equipment 
              SET status = 'available', 
                  cell_id = NULL,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [equipmentId], function(err) {
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
            });
          });
        }
      );
    });
  },
  
  /**
   * Получить доступную технику
   */
  getAvailableEquipment() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM equipment WHERE status = "available" ORDER BY name',
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  },
  
  /**
   * Получить количество техники по категориям
   */
  getEquipmentCountsByCategory() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT category_id, COUNT(*) as count
        FROM equipment
        WHERE category_id IS NOT NULL
        GROUP BY category_id
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const counts = {};
        (rows || []).forEach(row => {
          counts[row.category_id] = row.count;
        });
        resolve(counts);
      });
    });
  },
  
  /**
   * Получить количество техники по типам
   */
  getEquipmentCountsByType() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT type_id, COUNT(*) as count
        FROM equipment
        WHERE type_id IS NOT NULL
        GROUP BY type_id
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const counts = {};
        (rows || []).forEach(row => {
          counts[row.type_id] = row.count;
        });
        resolve(counts);
      });
    });
  }

  ,
  
  // ============================================================
  // ПЕРЕМЕЩЕНИЯ ТЕХНИКИ
  // ============================================================
  
  /**
   * Переместить технику в ячейку (расширенная версия)
   * Проверяет capacity, обновляет статус, возвращает старую и новую ячейки
   */
  moveEquipmentToCellDetailed(equipmentId, cellId, userId = null, userName = null) {
    return new Promise((resolve, reject) => {
      // Проверяем технику
      db.get(`
        SELECT 
          e.id, e.name, e.inventory_number, e.cell_id, e.status,
          cell.name as cell_name, cell.code as cell_code
        FROM equipment e
        LEFT JOIN cells cell ON e.cell_id = cell.id
        WHERE e.id = ?
      `, [equipmentId], (err, eq) => {
        if (err) {
          reject(err);
          return;
        }
        if (!eq) {
          reject(new Error('Техника не найдена'));
          return;
        }
        
        // Если ячейка не указана — просто убираем из ячейки
        if (!cellId) {
          db.run(`
            UPDATE equipment 
            SET cell_id = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [equipmentId], function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({
              success: true,
              equipment_id: equipmentId,
              inventory_number: eq.inventory_number,
              equipment_name: eq.name,
              from_cell_id: eq.cell_id,
              from_cell_name: eq.cell_name,
              from_cell_code: eq.cell_code,
              to_cell_id: null,
              to_cell_name: null,
              to_cell_code: null
            });
          });
          return;
        }
        
        // Проверяем новую ячейку
        db.get(`
          SELECT 
            c.id, c.name, c.code, c.capacity,
            rack.name as rack_name,
            zone.name as zone_name,
            wh.name as warehouse_name,
            (SELECT COUNT(*) FROM equipment WHERE cell_id = c.id) as current_count
          FROM cells c
          JOIN racks rack ON c.rack_id = rack.id
          JOIN zones zone ON rack.zone_id = zone.id
          JOIN warehouses wh ON zone.warehouse_id = wh.id
          WHERE c.id = ?
        `, [cellId], (err, cell) => {
          if (err) {
            reject(err);
            return;
          }
          if (!cell) {
            reject(new Error('Ячейка не найдена'));
            return;
          }
          
          // Если уже в этой ячейке — ничего не делаем
          if (eq.cell_id === parseInt(cellId)) {
            resolve({
              success: true,
              already_there: true,
              equipment_id: equipmentId,
              inventory_number: eq.inventory_number
            });
            return;
          }
          
          // Проверка capacity (если capacity задан)
          if (cell.capacity && cell.current_count >= cell.capacity) {
            reject(new Error(`Ячейка ${cell.code || cell.name} переполнена (${cell.current_count}/${cell.capacity})`));
            return;
          }
          
          // Перемещаем
          db.run(`
            UPDATE equipment 
            SET cell_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [cellId, equipmentId], function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            resolve({
              success: true,
              equipment_id: equipmentId,
              inventory_number: eq.inventory_number,
              equipment_name: eq.name,
              from_cell_id: eq.cell_id,
              from_cell_name: eq.cell_name,
              from_cell_code: eq.cell_code,
              to_cell_id: cell.id,
              to_cell_name: cell.name,
              to_cell_code: cell.code,
              to_warehouse_name: cell.warehouse_name,
              to_zone_name: cell.zone_name,
              to_rack_name: cell.rack_name
            });
          });
        });
      });
    });
  },
  
  /**
   * Получить историю перемещений техники
   * Использует activity_log с action = 'equipment_move'
   */
  getEquipmentMoves(equipmentId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          al.id,
          al.user_id,
          al.username,
          al.action,
          al.details,
          al.created_at,
          u.full_name as user_full_name,
          u.department as user_department
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = 'equipment' 
          AND al.entity_id = ?
          AND al.action = 'equipment_move'
        ORDER BY al.id DESC
      `, [equipmentId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }
});