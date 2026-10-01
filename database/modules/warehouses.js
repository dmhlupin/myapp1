// database/modules/warehouses.js
// Работа со складами: иерархия Склад → Зона → Стеллаж → Ячейка

module.exports = ({ db, run, get, all }) => ({

  // ============================================================
  // СКЛАДЫ (warehouses)
  // ============================================================

  /**
   * Получить все склады с количеством зон и техники
   */
  getAllWarehouses() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          w.id,
          w.name,
          w.address,
          w.description,
          w.is_default,
          w.is_active,
          w.created_at,
          w.updated_at,
          (SELECT COUNT(*) FROM zones WHERE warehouse_id = w.id AND is_active = 1) as zones_count,
          (SELECT COUNT(*) FROM equipment e 
            JOIN cells c ON e.cell_id = c.id
            JOIN racks r ON c.rack_id = r.id
            JOIN zones z ON r.zone_id = z.id
            WHERE z.warehouse_id = w.id
          ) as equipment_count
        FROM warehouses w
        ORDER BY w.is_default DESC, w.name ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Получить склад по ID
   */
  getWarehouseById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          w.*,
          (SELECT COUNT(*) FROM zones WHERE warehouse_id = w.id) as zones_count,
          (SELECT COUNT(*) FROM equipment e 
            JOIN cells c ON e.cell_id = c.id
            JOIN racks r ON c.rack_id = r.id
            JOIN zones z ON r.zone_id = z.id
            WHERE z.warehouse_id = w.id
          ) as equipment_count
        FROM warehouses w
        WHERE w.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Получить склад по умолчанию
   */
  getDefaultWarehouse() {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM warehouses 
        WHERE is_default = 1 AND is_active = 1
        LIMIT 1
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Создать склад
   */
  createWarehouse(data) {
    return new Promise((resolve, reject) => {
      const { name, address, description, is_default } = data;

      const doInsert = () => {
        db.run(`
          INSERT INTO warehouses (name, address, description, is_default, is_active)
          VALUES (?, ?, ?, ?, 1)
        `, [
          name,
          address || null,
          description || null,
          is_default ? 1 : 0
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id: this.lastID, ...data });
        });
      };

      // Если is_default = 1 — сбрасываем у других
      if (is_default) {
        db.run('UPDATE warehouses SET is_default = 0', (err) => {
          if (err) {
            reject(err);
            return;
          }
          doInsert();
        });
      } else {
        doInsert();
      }
    });
  },

  /**
   * Обновить склад
   */
  updateWarehouse(id, data) {
    return new Promise((resolve, reject) => {
      const { name, address, description, is_default, is_active } = data;

      const doUpdate = () => {
        db.run(`
          UPDATE warehouses 
          SET name = ?, address = ?, description = ?, 
              is_default = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          name,
          address || null,
          description || null,
          is_default ? 1 : 0,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
          id
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }
          if (this.changes === 0) {
            reject(new Error('Склад не найден'));
            return;
          }
          resolve({ id, ...data });
        });
      };

      // Если is_default = 1 — сбрасываем у других
      if (is_default) {
        db.run('UPDATE warehouses SET is_default = 0 WHERE id != ?', [id], (err) => {
          if (err) {
            reject(err);
            return;
          }
          doUpdate();
        });
      } else {
        doUpdate();
      }
    });
  },

  /**
   * Удалить склад
   * Нельзя удалить, если есть зоны или это склад по умолчанию
   */
  deleteWarehouse(id) {
    return new Promise((resolve, reject) => {
      // Проверяем, не склад ли по умолчанию
      db.get('SELECT is_default FROM warehouses WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          reject(new Error('Склад не найден'));
          return;
        }
        if (row.is_default) {
          reject(new Error('Нельзя удалить склад по умолчанию. Сначала назначьте другой.'));
          return;
        }

        // Проверяем зоны
        db.get('SELECT COUNT(*) as count FROM zones WHERE warehouse_id = ?', [id], (err, zonesRow) => {
          if (err) {
            reject(err);
            return;
          }
          if (zonesRow.count > 0) {
            reject(new Error(`Нельзя удалить склад: в нём ${zonesRow.count} зон. Сначала удалите зоны.`));
            return;
          }

          db.run('DELETE FROM warehouses WHERE id = ?', [id], function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ deleted: this.changes });
          });
        });
      });
    });
  },

  /**
   * Установить склад по умолчанию
   */
  setDefaultWarehouse(id) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run('UPDATE warehouses SET is_default = 0', (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          db.run('UPDATE warehouses SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], function(err) {
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
              resolve({ updated: this.changes });
            });
          });
        });
      });
    });
  },

  // ============================================================
  // ЗОНЫ (zones)
  // ============================================================

  /**
   * Получить все зоны склада
   */
  getZonesByWarehouse(warehouseId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          z.id,
          z.warehouse_id,
          z.name,
          z.description,
          z.sort_order,
          z.is_active,
          z.created_at,
          z.updated_at,
          (SELECT COUNT(*) FROM racks WHERE zone_id = z.id AND is_active = 1) as racks_count,
          (SELECT COUNT(*) FROM equipment e 
            JOIN cells c ON e.cell_id = c.id
            JOIN racks r ON c.rack_id = r.id
            WHERE r.zone_id = z.id
          ) as equipment_count
        FROM zones z
        WHERE z.warehouse_id = ?
        ORDER BY z.sort_order ASC, z.name ASC
      `, [warehouseId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Получить все зоны (всех складов)
   */
  getAllZones() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          z.*,
          w.name as warehouse_name
        FROM zones z
        JOIN warehouses w ON z.warehouse_id = w.id
        ORDER BY w.name ASC, z.sort_order ASC, z.name ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Получить зону по ID
   */
  getZoneById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          z.*,
          w.name as warehouse_name
        FROM zones z
        JOIN warehouses w ON z.warehouse_id = w.id
        WHERE z.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Создать зону
   */
  createZone(data) {
    return new Promise((resolve, reject) => {
      const { warehouse_id, name, description, sort_order } = data;

      // Проверяем склад
      db.get('SELECT id FROM warehouses WHERE id = ?', [warehouse_id], (err, wh) => {
        if (err) {
          reject(err);
          return;
        }
        if (!wh) {
          reject(new Error('Склад не найден'));
          return;
        }

        db.run(`
          INSERT INTO zones (warehouse_id, name, description, sort_order, is_active)
          VALUES (?, ?, ?, ?, 1)
        `, [warehouse_id, name, description || null, sort_order || 0], function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Зона с таким названием уже есть в этом складе'));
            } else {
              reject(err);
            }
            return;
          }
          resolve({ id: this.lastID, ...data });
        });
      });
    });
  },

  /**
   * Обновить зону
   */
  updateZone(id, data) {
    return new Promise((resolve, reject) => {
      const { name, description, sort_order, is_active } = data;

      db.run(`
        UPDATE zones 
        SET name = ?, description = ?, sort_order = ?, 
            is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name,
        description || null,
        sort_order || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            reject(new Error('Зона с таким названием уже есть'));
          } else {
            reject(err);
          }
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Зона не найдена'));
          return;
        }
        resolve({ id, ...data });
      });
    });
  },

  /**
   * Удалить зону
   */
  deleteZone(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM racks WHERE zone_id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count > 0) {
          reject(new Error(`Нельзя удалить зону: в ней ${row.count} стеллажей. Сначала удалите стеллажи.`));
          return;
        }

        db.run('DELETE FROM zones WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ deleted: this.changes });
        });
      });
    });
  },

  // ============================================================
  // СТЕЛЛАЖИ (racks)
  // ============================================================

  /**
   * Получить стеллажи зоны
   */
  getRacksByZone(zoneId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          r.id,
          r.zone_id,
          r.name,
          r.description,
          r.sort_order,
          r.is_active,
          r.created_at,
          r.updated_at,
          (SELECT COUNT(*) FROM cells WHERE rack_id = r.id AND is_active = 1) as cells_count,
          (SELECT COUNT(*) FROM equipment e 
            JOIN cells c ON e.cell_id = c.id
            WHERE c.rack_id = r.id
          ) as equipment_count
        FROM racks r
        WHERE r.zone_id = ?
        ORDER BY r.sort_order ASC, r.name ASC
      `, [zoneId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Получить стеллаж по ID
   */
  getRackById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          r.*,
          z.name as zone_name,
          z.warehouse_id,
          w.name as warehouse_name
        FROM racks r
        JOIN zones z ON r.zone_id = z.id
        JOIN warehouses w ON z.warehouse_id = w.id
        WHERE r.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Создать стеллаж
   */
  createRack(data) {
    return new Promise((resolve, reject) => {
      const { zone_id, name, description, sort_order } = data;

      // Проверяем зону
      db.get('SELECT id FROM zones WHERE id = ?', [zone_id], (err, zone) => {
        if (err) {
          reject(err);
          return;
        }
        if (!zone) {
          reject(new Error('Зона не найдена'));
          return;
        }

        db.run(`
          INSERT INTO racks (zone_id, name, description, sort_order, is_active)
          VALUES (?, ?, ?, ?, 1)
        `, [zone_id, name, description || null, sort_order || 0], function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Стеллаж с таким названием уже есть в этой зоне'));
            } else {
              reject(err);
            }
            return;
          }
          resolve({ id: this.lastID, ...data });
        });
      });
    });
  },

  /**
   * Обновить стеллаж
   */
  updateRack(id, data) {
    return new Promise((resolve, reject) => {
      const { name, description, sort_order, is_active } = data;

      db.run(`
        UPDATE racks 
        SET name = ?, description = ?, sort_order = ?, 
            is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name,
        description || null,
        sort_order || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            reject(new Error('Стеллаж с таким названием уже есть'));
          } else {
            reject(err);
          }
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Стеллаж не найден'));
          return;
        }
        resolve({ id, ...data });
      });
    });
  },

  /**
   * Удалить стеллаж
   */
  deleteRack(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM cells WHERE rack_id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count > 0) {
          reject(new Error(`Нельзя удалить стеллаж: в нём ${row.count} ячеек. Сначала удалите ячейки.`));
          return;
        }

        db.run('DELETE FROM racks WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ deleted: this.changes });
        });
      });
    });
  },

  // ============================================================
  // ЯЧЕЙКИ (cells)
  // ============================================================

  /**
   * Получить ячейки стеллажа
   */
  getCellsByRack(rackId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          c.id,
          c.rack_id,
          c.name,
          c.code,
          c.capacity,
          c.description,
          c.sort_order,
          c.is_active,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM equipment WHERE cell_id = c.id) as equipment_count
        FROM cells c
        WHERE c.rack_id = ?
        ORDER BY c.sort_order ASC, c.name ASC
      `, [rackId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Получить ячейку по ID
   */
  getCellById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          c.*,
          r.name as rack_name,
          r.zone_id,
          z.name as zone_name,
          z.warehouse_id,
          w.name as warehouse_name
        FROM cells c
        JOIN racks r ON c.rack_id = r.id
        JOIN zones z ON r.zone_id = z.id
        JOIN warehouses w ON z.warehouse_id = w.id
        WHERE c.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Создать ячейку
   */
  createCell(data) {
    return new Promise((resolve, reject) => {
      const { rack_id, name, code, capacity, description, sort_order } = data;

      // Проверяем стеллаж
      db.get('SELECT id FROM racks WHERE id = ?', [rack_id], (err, rack) => {
        if (err) {
          reject(err);
          return;
        }
        if (!rack) {
          reject(new Error('Стеллаж не найден'));
          return;
        }

        db.run(`
          INSERT INTO cells (rack_id, name, code, capacity, description, sort_order, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [rack_id, name, code || null, capacity || null, description || null, sort_order || 0], function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Ячейка с таким названием уже есть в этом стеллаже'));
            } else {
              reject(err);
            }
            return;
          }
          resolve({ id: this.lastID, ...data });
        });
      });
    });
  },

  /**
   * Обновить ячейку
   */
  updateCell(id, data) {
    return new Promise((resolve, reject) => {
      const { name, code, capacity, description, sort_order, is_active } = data;

      db.run(`
        UPDATE cells 
        SET name = ?, code = ?, capacity = ?, description = ?, 
            sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name,
        code || null,
        capacity || null,
        description || null,
        sort_order || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            reject(new Error('Ячейка с таким названием уже есть'));
          } else {
            reject(err);
          }
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Ячейка не найдена'));
          return;
        }
        resolve({ id, ...data });
      });
    });
  },

  /**
   * Удалить ячейку
   * Нельзя удалить, если в ней техника
   */
  deleteCell(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM equipment WHERE cell_id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count > 0) {
          reject(new Error(`Нельзя удалить ячейку: в ней ${row.count} единиц техники.`));
          return;
        }

        db.run('DELETE FROM cells WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ deleted: this.changes });
        });
      });
    });
  },

  /**
   * Получить полный адрес ячейки (для отображения)
   */
  getCellFullPath(cellId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          w.name as warehouse_name,
          z.name as zone_name,
          r.name as rack_name,
          c.name as cell_name,
          c.code
        FROM cells c
        JOIN racks r ON c.rack_id = r.id
        JOIN zones z ON r.zone_id = z.id
        JOIN warehouses w ON z.warehouse_id = w.id
        WHERE c.id = ?
      `, [cellId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  /**
   * Получить дерево складов (склады → зоны → стеллажи → ячейки)
   */
  getWarehouseTree(warehouseId = null) {
    return new Promise((resolve, reject) => {
      const warehouseFilter = warehouseId ? 'WHERE w.id = ?' : '';
      const params = warehouseId ? [warehouseId] : [];

      db.all(`
        SELECT 
          w.id as warehouse_id,
          w.name as warehouse_name,
          w.is_default,
          z.id as zone_id,
          z.name as zone_name,
          z.sort_order as zone_sort,
          r.id as rack_id,
          r.name as rack_name,
          r.sort_order as rack_sort,
          c.id as cell_id,
          c.name as cell_name,
          c.code as cell_code,
          c.sort_order as cell_sort,
          (SELECT COUNT(*) FROM equipment WHERE cell_id = c.id) as equipment_count
        FROM warehouses w
        LEFT JOIN zones z ON z.warehouse_id = w.id AND z.is_active = 1
        LEFT JOIN racks r ON r.zone_id = z.id AND r.is_active = 1
        LEFT JOIN cells c ON c.rack_id = r.id AND c.is_active = 1
        ${warehouseFilter}
        ORDER BY w.name, z.sort_order, z.name, r.sort_order, r.name, c.sort_order, c.name
      `, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Группируем в дерево
        const tree = {};
        (rows || []).forEach(row => {
          if (!tree[row.warehouse_id]) {
            tree[row.warehouse_id] = {
              id: row.warehouse_id,
              name: row.warehouse_name,
              is_default: row.is_default,
              zones: {}
            };
          }
          
          if (row.zone_id) {
            if (!tree[row.warehouse_id].zones[row.zone_id]) {
              tree[row.warehouse_id].zones[row.zone_id] = {
                id: row.zone_id,
                name: row.zone_name,
                racks: {}
              };
            }
            
            if (row.rack_id) {
              if (!tree[row.warehouse_id].zones[row.zone_id].racks[row.rack_id]) {
                tree[row.warehouse_id].zones[row.zone_id].racks[row.rack_id] = {
                  id: row.rack_id,
                  name: row.rack_name,
                  cells: []
                };
              }
              
              if (row.cell_id) {
                tree[row.warehouse_id].zones[row.zone_id].racks[row.rack_id].cells.push({
                  id: row.cell_id,
                  name: row.cell_name,
                  code: row.cell_code,
                  equipment_count: row.equipment_count
                });
              }
            }
          }
        });
        
        // Преобразуем объекты в массивы
        const result = Object.values(tree).map(w => ({
          ...w,
          zones: Object.values(w.zones).map(z => ({
            ...z,
            racks: Object.values(z.racks)
          }))
        }));
        
        resolve(result);
      });
    });
  },

  /**
   * Получить всю технику в ячейке
   */
  getEquipmentInCell(cellId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          e.id,
          e.inventory_number,
          e.name,
          e.model,
          e.status,
          e.category_id,
          e.type_id,
          c.name as category_name,
          c.icon as category_icon,
          t.name as type_name,
          t.icon as type_icon
        FROM equipment e
        LEFT JOIN equipment_categories c ON e.category_id = c.id
        LEFT JOIN equipment_types t ON e.type_id = t.id
        WHERE e.cell_id = ?
        ORDER BY e.inventory_number
      `, [cellId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Переместить технику в ячейку
   */
  moveEquipmentToCell(equipmentId, cellId) {
    return new Promise((resolve, reject) => {
      // Проверяем технику
      db.get('SELECT id, name, cell_id FROM equipment WHERE id = ?', [equipmentId], (err, eq) => {
        if (err) {
          reject(err);
          return;
        }
        if (!eq) {
          reject(new Error('Техника не найдена'));
          return;
        }

        // Проверяем ячейку (если указана)
        const checkCell = (callback) => {
          if (!cellId) {
            callback(null);
            return;
          }
          db.get(`
            SELECT c.id, c.capacity, 
                   (SELECT COUNT(*) FROM equipment WHERE cell_id = c.id) as current_count
            FROM cells c WHERE c.id = ?
          `, [cellId], (err, cell) => {
            if (err) {
              reject(err);
              return;
            }
            if (!cell) {
              reject(new Error('Ячейка не найдена'));
              return;
            }
            // Проверка на переполнение
            if (cell.capacity && cell.current_count >= cell.capacity && eq.cell_id !== cellId) {
              reject(new Error(`Ячейка переполнена (${cell.current_count}/${cell.capacity})`));
              return;
            }
            callback(cell);
          });
        };

        checkCell(() => {
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
              updated: this.changes,
              old_cell_id: eq.cell_id,
              new_cell_id: cellId,
              equipment_name: eq.name
            });
          });
        });
      });
    });
  },

  /**
   * Получить статистику по складам
   */
  getWarehouseStats() {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM warehouses WHERE is_active = 1) as total_warehouses,
          (SELECT COUNT(*) FROM zones WHERE is_active = 1) as total_zones,
          (SELECT COUNT(*) FROM racks WHERE is_active = 1) as total_racks,
          (SELECT COUNT(*) FROM cells WHERE is_active = 1) as total_cells,
          (SELECT COUNT(*) FROM equipment WHERE cell_id IS NOT NULL) as equipment_on_stock,
          (SELECT COUNT(*) FROM equipment WHERE cell_id IS NULL AND status = 'available') as equipment_without_cell
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

});