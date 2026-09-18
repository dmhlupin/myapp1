// utils/logger.js
const { db } = require('../database/db');

/**
 * Логирование действия пользователя
 * @param {Object} options - параметры логирования
 * @param {Object} options.req - Express request объект
 * @param {string} options.action - действие (login, logout, create, update, delete, etc.)
 * @param {string} [options.entityType] - тип сущности (user, equipment, assignment)
 * @param {number} [options.entityId] - ID сущности
 * @param {string} [options.details] - дополнительные детали (JSON строка)
 * @param {number} [options.userId] - ID пользователя (если не из req.session)
 * @param {string} [options.username] - логин (если не из req.session)
 */
function logAction(options) {
  return new Promise((resolve, reject) => {
    const {
      req,
      action,
      entityType = null,
      entityId = null,
      details = null,
      userId = null,
      username = null
    } = options;

    // Пытаемся получить данные из сессии, если не переданы явно
    const finalUserId = userId || (req && req.session && req.session.userId) || null;
    const finalUsername = username || (req && req.session && req.session.username) || null;
    
    // Получаем IP и User-Agent
    const ipAddress = req 
      ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown')
      : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;

    db.run(
      `INSERT INTO activity_log 
       (user_id, username, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalUserId, finalUsername, action, entityType, entityId, details, ipAddress, userAgent],
      function(err) {
        if (err) {
          console.error('❌ Ошибка логирования:', err.message);
          reject(err);
          return;
        }
        resolve(this.lastID);
      }
    );
  });
}

/**
 * Получить логи с фильтрацией
 * @param {Object} filters - фильтры
 * @param {number} [filters.userId] - фильтр по пользователю
 * @param {string} [filters.action] - фильтр по действию
 * @param {string} [filters.dateFrom] - дата с (ISO)
 * @param {string} [filters.dateTo] - дата по (ISO)
 * @param {number} [filters.limit] - лимит записей
 * @param {number} [filters.offset] - смещение
 * @returns {Promise<Array>} - массив логов
 */
function getLogs(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        al.*,
        u.full_name as user_full_name
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
    
    if (filters.dateFrom) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.dateTo);
    }
    
    sql += ' ORDER BY al.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }
    
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
 * Получить статистику логов
 * @returns {Promise<Object>} - статистика
 */
function getLogsStats() {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins,
        SUM(CASE WHEN action = 'login_failed' THEN 1 ELSE 0 END) as failed_logins,
        SUM(CASE WHEN action LIKE 'equipment_%' THEN 1 ELSE 0 END) as equipment_actions,
        SUM(CASE WHEN action LIKE 'user_%' THEN 1 ELSE 0 END) as user_actions
      FROM activity_log
      WHERE created_at >= datetime('now', '-30 days')
    `, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

module.exports = {
  logAction,
  getLogs,
  getLogsStats
};