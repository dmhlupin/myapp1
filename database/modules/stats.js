// database/modules/stats.js
// Общая статистика системы

module.exports = ({ db, run, get, all }) => ({
  
  /**
   * Получить сводную статистику по системе
   * Используется в админ-панели и на дашборде
   */
  getStats() {
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
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
});