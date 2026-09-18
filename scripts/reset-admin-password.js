// scripts/reset-admin-password.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function resetPassword() {
  const username = await ask('Логин администратора (по умолчанию admin): ') || 'admin';
  const newPassword = await ask('Новый пароль (по умолчанию NewAdmin123!): ') || 'NewAdmin123!';
  
  db.get('SELECT id FROM users WHERE username = ? AND role = "admin"', [username], async (err, row) => {
    if (err) {
      console.error('❌ Ошибка:', err);
      rl.close();
      db.close();
      return;
    }
    
    if (!row) {
      console.log(`❌ Админ "${username}" не найден`);
      rl.close();
      db.close();
      return;
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    
    db.run(
      `UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hash, row.id],
      function(err) {
        if (err) {
          console.error('❌ Ошибка:', err);
        } else {
          console.log('✅ Пароль сброшен:');
          console.log(`   Логин:  ${username}`);
          console.log(`   Пароль: ${newPassword}`);
          console.log(`   ⚠️  При входе потребуется смена пароля`);
        }
        rl.close();
        db.close();
      }
    );
  });
}

resetPassword();