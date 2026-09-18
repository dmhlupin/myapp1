// scripts/fix-double-assignments.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Поиск двойных назначений...\n');

// Находим технику с несколькими активными назначениями
db.all(`
  SELECT 
    equipment_id,
    COUNT(*) as active_count,
    GROUP_CONCAT(id) as assignment_ids,
    GROUP_CONCAT(user_id) as user_ids
  FROM user_equipment
  WHERE returned_date IS NULL
  GROUP BY equipment_id
  HAVING COUNT(*) > 1
`, (err, rows) => {
  if (err) {
    console.error('❌ Ошибка:', err);
    db.close();
    return;
  }
  
  if (rows.length === 0) {
    console.log('✅ Двойных назначений не найдено!');
    db.close();
    return;
  }
  
  console.log(`⚠️  Найдено ${rows.length} проблем:\n`);
  
  rows.forEach(row => {
    console.log(`  Техника ID ${row.equipment_id}: ${row.active_count} активных назначений`);
    console.log(`    Assignment IDs: ${row.assignment_ids}`);
    console.log(`    User IDs: ${row.user_ids}`);
  });
  
  console.log('\n🔧 Исправление: оставляем ПОСЛЕДНЕЕ назначение, остальные закрываем...\n');
  
  // Для каждой проблемной техники оставляем последнее назначение
  const fixPromises = rows.map(row => {
    return new Promise((resolve, reject) => {
      const assignmentIds = row.assignment_ids.split(',').map(Number);
      const idsToClose = assignmentIds.slice(0, -1); // Все, кроме последнего
      
      if (idsToClose.length === 0) {
        resolve({ fixed: 0 });
        return;
      }
      
      const placeholders = idsToClose.map(() => '?').join(',');
      
      db.run(
        `UPDATE user_equipment 
         SET returned_date = CURRENT_TIMESTAMP,
             condition_on_return = 'Автоисправление: закрытие дублирующего назначения',
             notes = COALESCE(notes, '') || ' | Автоисправление дубликата'
         WHERE id IN (${placeholders})`,
        idsToClose,
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          console.log(`  ✅ Техника ${row.equipment_id}: закрыто ${this.changes} назначений`);
          resolve({ fixed: this.changes });
        }
      );
    });
  });
  
  Promise.all(fixPromises)
    .then(results => {
      const totalFixed = results.reduce((sum, r) => sum + r.fixed, 0);
      console.log(`\n✅ Всего закрыто: ${totalFixed} дублирующих назначений`);
      console.log('📊 Проверьте результаты на странице /equipment');
      db.close();
    })
    .catch(err => {
      console.error('❌ Ошибка исправления:', err);
      db.close();
    });
});