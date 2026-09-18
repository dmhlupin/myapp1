// scripts/check-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Проверка структуры базы данных...\n');

// Проверяем структуру таблицы users
db.all(`PRAGMA table_info(users)`, (err, columns) => {
  if (err) {
    console.error('❌ Ошибка:', err);
    return;
  }
  
  console.log('📋 Таблица users:');
  console.log('─'.repeat(60));
  columns.forEach(col => {
    console.log(`  ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}`);
  });
  console.log('');
  
  // Проверяем структуру activity_log
  db.all(`PRAGMA table_info(activity_log)`, (err, columns) => {
    if (err) {
      console.error('❌ Ошибка:', err);
      return;
    }
    
    console.log('📋 Таблица activity_log:');
    console.log('─'.repeat(60));
    columns.forEach(col => {
      console.log(`  ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}`);
    });
    console.log('');
    
    // Проверяем пользователей
    db.all(`SELECT id, username, email, role, is_active, must_change_password FROM users`, (err, users) => {
      if (err) {
        console.error('❌ Ошибка:', err);
        return;
      }
      
      console.log('👥 Пользователи:');
      console.log('─'.repeat(80));
      console.log(`  ${'ID'.padEnd(5)} ${'Логин'.padEnd(15)} ${'Роль'.padEnd(10)} ${'Активен'.padEnd(10)} ${'Сменить пароль'.padEnd(15)}`);
      console.log('─'.repeat(80));
      users.forEach(u => {
        console.log(`  ${String(u.id).padEnd(5)} ${u.username.padEnd(15)} ${u.role.padEnd(10)} ${(u.is_active ? 'Да' : 'Нет').padEnd(10)} ${(u.must_change_password ? 'Да' : 'Нет').padEnd(15)}`);
      });
      console.log('');
      
      // Проверяем, что у всех есть пароль
      db.all(`SELECT COUNT(*) as total, SUM(CASE WHEN password_hash IS NULL OR password_hash = '' THEN 1 ELSE 0 END) as no_pass FROM users`, (err, result) => {
        if (err) {
          console.error('❌ Ошибка:', err);
          return;
        }
        
        console.log('🔐 Проверка паролей:');
        console.log(`  Всего пользователей: ${result[0].total}`);
        console.log(`  Без пароля: ${result[0].no_pass}`);
        
        if (result[0].no_pass === 0) {
          console.log('  ✅ У всех пользователей есть пароль');
        } else {
          console.log('  ⚠️  Есть пользователи без пароля!');
        }
        
        db.close();
      });
    });
  });
});