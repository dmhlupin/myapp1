// database/modules/cells.js
// Общие хелперы для ячеек склада.
// Функции не привязаны к контексту модуля — принимают db явно,
// чтобы можно было использовать из других модулей (equipment, warehouses)
// и из роутов без циклических зависимостей.

// ============================================================
// ПРОВЕРКА ЯЧЕЙКИ
// ============================================================

/**
 * Проверить, можно ли положить технику в ячейку.
 * Учитывает:
 *   - ручной флаг is_full
 *   - числовой лимит capacity (если задан)
 *
 * @param {object} db — sqlite3.Database
 * @param {number} cellId
 * @param {number|null} excludeEquipmentId — ID техники, которую не учитываем
 *                                          (например, при сохранении той же
 *                                           техники в ту же ячейку)
 * @returns {Promise<{ok: boolean, reason?: string, cell?: object, label?: string}>}
 */
function checkCellAvailability(db, cellId, excludeEquipmentId = null) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT
        c.id, c.name, c.code, c.capacity, c.is_full,
        rack.name as rack_name,
        zone.name as zone_name,
        wh.name as warehouse_name,
        (SELECT COUNT(*) FROM equipment
         WHERE cell_id = c.id
           AND (? IS NULL OR id != ?)
        ) as current_count
      FROM cells c
      JOIN racks rack ON c.rack_id = rack.id
      JOIN zones zone ON rack.zone_id = zone.id
      JOIN warehouses wh ON zone.warehouse_id = wh.id
      WHERE c.id = ?
    `, [excludeEquipmentId, excludeEquipmentId, cellId], (err, cell) => {
      if (err) return reject(err);
      if (!cell) return resolve({ ok: false, reason: 'cell_not_found' });

      const label = cell.code || cell.name;

      if (cell.is_full === 1) {
        return resolve({ ok: false, reason: 'is_full', cell, label });
      }
      if (cell.capacity && cell.current_count >= cell.capacity) {
        return resolve({ ok: false, reason: 'over_capacity', cell, label });
      }
      return resolve({ ok: true, cell, label });
    });
  });
}

module.exports = {
  checkCellAvailability,
};