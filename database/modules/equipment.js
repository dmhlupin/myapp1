// database/modules/equipment.js
// Работа с техникой: CRUD + назначения

module.exports = ({ db, run, get, all }) => ({
  
  // ============================================================
  // CRUD ТЕХНИКИ
  // ============================================================
  
  /**
   * Получить всю технику
   */
  getAllEquipment() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM equipment ORDER BY name',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },
  
  /**
   * Получить технику по ID
   */
  getEquipmentById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM equipment WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
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
        status, description, category_id, type_id 
      } = eqData;
      
      db.run(`
        INSERT INTO equipment 
        (inventory_number, name, model, serial_number, manufacturer, 
         purchase_date, warranty_until, status, description, category_id, type_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inventory_number, name, model, serial_number, manufacturer, 
        purchase_date, warranty_until, status || 'available', description,
        category_id || null, type_id || null
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
        status, description, category_id, type_id 
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
        
        // Внутренняя функция для обновления
        const performUpdate = (returned = false) => {
          db.run(`
            UPDATE equipment 
            SET inventory_number = ?, name = ?, model = ?, serial_number = ?, 
                manufacturer = ?, purchase_date = ?, warranty_until = ?, 
                status = ?, description = ?, 
                category_id = ?, type_id = ?,
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
            
            resolve({ id: idNum, ...eqData, returned });
          });
        };
        
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
              
              if (!assignment) {
                // Нет активного назначения — просто обновляем
                performUpdate(false);
                return;
              }
              
              // Закрываем назначение
              db.run(`
                UPDATE user_equipment 
                SET returned_date = CURRENT_TIMESTAMP, 
                    condition_on_return = ?
                WHERE id = ?
              `, ['Возвращена при изменении статуса', assignment.id], (err) => {
                if (err) {
                  // Логируем, но не блокируем
                  console.error('Ошибка при возврате техники:', err.message);
                }
                performUpdate(true);
              });
            }
          );
        } else {
          performUpdate(false);
        }
      });
    });
  },
  
  /**
   * Удалить технику
   * Нельзя удалить, если она назначена
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
                  
                  db.run(`
                    UPDATE equipment 
                    SET status = 'assigned', updated_at = CURRENT_TIMESTAMP 
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
                    // Логируем ошибку, но продолжаем
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
   * Устанавливает returned_date и меняет статус на available
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
            
            db.run(`
              UPDATE equipment 
              SET status = 'available', updated_at = CURRENT_TIMESTAMP 
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
  }
  
});

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
// ============================================================
// Вынесена за пределы объекта, так как вызывается внутри updateEquipment

