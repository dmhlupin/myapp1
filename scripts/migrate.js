// scripts/migrate.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Начало миграции базы данных...\n');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function columnExists(table, column) {
  const columns = await all(`PRAGMA table_info(${table})`);
  return columns.some(c => c.name === column);
}

async function tableExists(table) {
  const result = await get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table]
  );
  return !!result;
}

async function migrate() {
  try {
    // 1. Проверяем, существует ли таблица users
    const usersExists = await tableExists('users');
    
    if (!usersExists) {
      console.log('📋 Таблица users не существует — создаём с нуля...');
      await run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          department TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          is_active INTEGER NOT NULL DEFAULT 1,
          must_change_password INTEGER NOT NULL DEFAULT 0,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица users создана');
    } else {
      // 2. Добавляем поля, если их нет
      console.log('📋 Таблица users существует, проверяем поля...');
      
      const fieldsToAdd = [
        { name: 'password_hash', sql: `ALTER TABLE users ADD COLUMN password_hash TEXT` },
        { name: 'role', sql: `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'` },
        { name: 'is_active', sql: `ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1` },
        { name: 'must_change_password', sql: `ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0` },
        { name: 'last_login', sql: `ALTER TABLE users ADD COLUMN last_login DATETIME` }
      ];
      
      for (const field of fieldsToAdd) {
        const exists = await columnExists('users', field.name);
        if (!exists) {
          await run(field.sql);
          console.log(`  ✅ Добавлено поле: ${field.name}`);
        } else {
          console.log(`  ⏭️  Поле уже есть: ${field.name}`);
        }
      }
      
      // 3. Устанавливаем пароль по умолчанию для существующих пользователей
      const usersWithoutPassword = await all(
        `SELECT id, username FROM users WHERE password_hash IS NULL OR password_hash = ''`
      );
      
      if (usersWithoutPassword.length > 0) {
        console.log(`\n🔑 Установка пароля по умолчанию для ${usersWithoutPassword.length} пользователей...`);
        const defaultPassword = 'ChangeMe123!';
        const hash = await bcrypt.hash(defaultPassword, 10);
        
        for (const user of usersWithoutPassword) {
          await run(
            `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`,
            [hash, user.id]
          );
          console.log(`  ✅ ${user.username} — пароль: ${defaultPassword}`);
        }
        
        console.log(`\n⚠️  ВАЖНО! Все существующие пользователи получили пароль: ${defaultPassword}`);
        console.log(`⚠️  При первом входе они должны будут сменить его.\n`);
      }
    }
    
    // 4. Создаём таблицу activity_log для логирования
    const logExists = await tableExists('activity_log');
    if (!logExists) {
      await run(`
        CREATE TABLE activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          username TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Таблица activity_log создана');
    } else {
      console.log('⏭️  Таблица activity_log уже существует');
    }
    
    // 5. Создаём индексы для логирования
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)`);
    console.log('✅ Индексы для activity_log созданы');
    
    // 6. Проверяем, есть ли хотя бы один администратор
    const adminExists = await get(`SELECT id, username FROM users WHERE role = 'admin' LIMIT 1`);
    
    if (!adminExists) {
      console.log('\n👤 Администратор не найден — создаём...');
      
      const adminPassword = 'Admin123!';
      const adminHash = await bcrypt.hash(adminPassword, 10);
      
      await run(`
        INSERT INTO users (username, email, full_name, password_hash, role, is_active, must_change_password)
        VALUES (?, ?, ?, ?, 'admin', 1, 1)
      `, [
        'admin',
        'admin@company.com',
        'Администратор системы',
        adminHash
      ]);
      
      console.log('✅ Создан администратор:');
      console.log(`   Логин: admin`);
      console.log(`   Пароль: ${adminPassword}`);
      console.log(`   ⚠️  Смените пароль после первого входа!\n`);
    } else {
      console.log(`\n👤 Администратор уже существует: ${adminExists.username}`);
    }
    
    console.log('✅ Миграция завершена успешно!\n');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();