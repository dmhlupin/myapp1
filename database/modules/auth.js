// database/modules/auth.js
// Авторизация: пароли, роли, активность, валидация сессий

module.exports = ({ db, run, get, all }) => ({
  
  /**
   * Получить пользователя по логину с паролем
   * Используется при входе в систему
   */
  getUserByUsernameWithPassword(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },
  
  /**
   * Обновить пароль пользователя
   * @param {number} userId - ID пользователя
   * @param {string} passwordHash - хеш нового пароля
   * @param {number} mustChange - 1 если требуется смена при следующем входе, 0 иначе
   */
  updateUserPassword(userId, passwordHash, mustChange = 0) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE users 
        SET password_hash = ?, 
            must_change_password = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [passwordHash, mustChange, userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      });
    });
  },
  
  /**
   * Обновить время последнего входа
   */
  updateLastLogin(userId) {
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
  },
  
  /**
   * Изменить активность пользователя (блокировка/разблокировка)
   */
  setUserActive(userId, isActive) {
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
  },
  
  /**
   * Проверить валидность сессии
   * Возвращает минимальные данные пользователя для синхронизации
   */
  validateSessionUser(userId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          id, 
          username, 
          full_name, 
          role, 
          is_active, 
          must_change_password
        FROM users
        WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
});