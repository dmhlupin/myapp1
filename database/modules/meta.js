// database/modules/meta.js
// Служебные данные приложения (app_meta)

module.exports = ({ db, run, get, all }) => ({
  
  /**
   * Получить значение из app_meta
   */
  getAppMeta(key) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT value FROM app_meta WHERE key = ?',
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.value : null);
        }
      );
    });
  },
  
  /**
   * Установить значение в app_meta
   */
  setAppMeta(key, value) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO app_meta (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `, [key, value], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ updated: this.changes });
      });
    });
  },
  
  /**
   * Получить версию БД (для проверки сессий)
   */
  getDbVersion() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT value FROM app_meta WHERE key = 'db_seed_version'`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.value : null);
        }
      );
    });
  }
  
});