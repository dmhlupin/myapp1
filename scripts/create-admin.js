// scripts/create-admin.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const email = process.env.ADMIN_EMAIL || 'admin@company.com';
  const fullName = process.env.ADMIN_NAME || 'Администратор системы';
  
  const hash = await bcrypt.hash(password, 10);
  
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('❌ Ошибка:', err);
      db.close();
      return;
    }
    
    if (row) {
      console.log(`⚠️  Пользователь "${username}" уже существует (ID: ${row.id})`);
      console.log('💡 Если забыли пароль — используйте сброс или смените через админку');
      db.close();
      return;
    }
    
    db.run(
      `INSERT INTO users (username, email, full_name, password_hash, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
      [username, email, fullName, hash],
      function(err) {
        if (err) {
          console.error('❌ Ошибка создания:', err);
          db.close();
          return;
        }
        
        console.log('✅ Администратор создан:');
        console.log(`   ID:     ${this.lastID}`);
        console.log(`   Логин:  ${username}`);
        console.log(`   Пароль: ${password}`);
        console.log(`   ⚠️  Смените пароль после первого входа!`);
        db.close();
      }
    );
  });
}

createAdmin();