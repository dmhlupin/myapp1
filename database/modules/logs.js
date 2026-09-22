// database/modules/logs.js
// Работа с логами активности: выборка, фильтры, статистика

module.exports = ({ db, run, get, all }) => ({
  
  /**
   * Получить логи с фильтрами и пагинацией
   */
  getActivityLogs(filters = {}) {
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
        const term = `%${filters.search}%`;
        params.push(term, term, term);
      }
      
      sql += ' ORDER BY al.created_at DESC';
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  /**
   * Получить общее количество логов с учётом фильтров
   * (для пагинации)
   */
  getActivityLogsCount(filters = {}) {
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
        const term = `%${filters.search}%`;
        params.push(term, term, term);
      }
      
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.total : 0);
      });
    });
  },
  
  /**
   * Получить список уникальных действий с количеством
   * (для фильтра)
   */
  getUniqueActions() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT action, COUNT(*) as count 
        FROM activity_log 
        GROUP BY action 
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  /**
   * Получить статистику логов за период
   * @param {number} days - период в днях (по умолчанию 30)
   */
  getActivityStats(days = 30) {
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
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  },
  
  /**
   * Очистить логи старше N дней
   */
  cleanOldLogs(days = 90) {
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

    ,
  
  /**
   * Получить активность по дням (за период)
   */
  getActivityByDay(days = 14) {
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
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
  
});