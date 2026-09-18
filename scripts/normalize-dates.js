// scripts/normalize-dates.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Нормализация дат в user_equipment...\n');

db.all('SELECT id, assigned_date, returned_date FROM user_equipment', (err, rows) => {
  if (err) {
    console.error('❌ Ошибка:', err);
    db.close();
    return;
  }
  
  console.log(`📋 Найдено ${rows.length} записей\n`);
  
  let updated = 0;
  
  rows.forEach(row => {
    const newAssigned = normalizeDate(row.assigned_date);
    const newReturned = normalizeDate(row.returned_date);
    
    const needsUpdate = 
      newAssigned !== row.assigned_date || 
      newReturned !== row.returned_date;
    
    if (needsUpdate) {
      db.run(
        'UPDATE user_equipment SET assigned_date = ?, returned_date = ? WHERE id = ?',
        [newAssigned, newReturned, row.id],
        function(err) {
          if (err) {
            console.error(`❌ Ошибка ID ${row.id}:`, err.message);
          } else {
            updated++;
            console.log(`  ✅ ID ${row.id}: ${row.assigned_date} → ${newAssigned}`);
          }
        }
      );
    }
  });
  
  setTimeout(() => {
    console.log(`\n✅ Обновлено записей: ${updated}`);
    db.close();
  }, 1000);
});

/**
 * Преобразует любую дату в формат SQLite: YYYY-MM-DD HH:MM:SS
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Пробуем распарсить как ISO или обычную дату
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // не удалось — оставляем как есть
    
    // Формат YYYY-MM-DD HH:MM:SS (UTC)
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  } catch {
    return dateStr;
  }
}