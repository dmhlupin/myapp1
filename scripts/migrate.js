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
    
        // 4.5. Создаём таблицу категорий техники
    const categoriesExists = await tableExists('equipment_categories');
    if (!categoriesExists) {
      await run(`
        CREATE TABLE equipment_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица equipment_categories создана');
    } else {
      console.log('⏭️  Таблица equipment_categories уже существует');
    }

    // 4.6. Создаём таблицу типов техники
    const typesExists = await tableExists('equipment_types');
    if (!typesExists) {
      await run(`
        CREATE TABLE equipment_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE RESTRICT,
          UNIQUE(category_id, name)
        )
      `);
      console.log('✅ Таблица equipment_types создана');
    } else {
      console.log('⏭️  Таблица equipment_types уже существует');
    }

    // 4.7. Добавляем поля category_id и type_id в equipment
    const equipmentTableExists = await tableExists('equipment');
    if (equipmentTableExists) {
      const categoryFieldExists = await columnExists('equipment', 'category_id');
      if (!categoryFieldExists) {
        await run(`ALTER TABLE equipment ADD COLUMN category_id INTEGER REFERENCES equipment_categories(id) ON DELETE SET NULL`);
        console.log('  ✅ Добавлено поле: equipment.category_id');
      } else {
        console.log('  ⏭️  Поле equipment.category_id уже есть');
      }
      
      const typeFieldExists = await columnExists('equipment', 'type_id');
      if (!typeFieldExists) {
        await run(`ALTER TABLE equipment ADD COLUMN type_id INTEGER REFERENCES equipment_types(id) ON DELETE SET NULL`);
        console.log('  ✅ Добавлено поле: equipment.type_id');
      } else {
        console.log('  ⏭️  Поле equipment.type_id уже есть');
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

    // 4.5. Создаём таблицу app_meta для служебных данных
    const metaExists = await tableExists('app_meta');
    if (!metaExists) {
      await run(`
        CREATE TABLE app_meta (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица app_meta создана');
      
      // Устанавливаем начальную версию
      await run(`
        INSERT INTO app_meta (key, value) 
        VALUES ('db_seed_version', ?)
      `, [Date.now().toString()]);
      console.log('✅ Установлена начальная версия БД');
    } else {
      console.log('⏭️  Таблица app_meta уже существует');
    }
    
    // Индексы для категорий и типов
    await run('CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_types_category ON equipment_types(category_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_categories_sort ON equipment_categories(sort_order)');
    await run('CREATE INDEX IF NOT EXISTS idx_types_sort ON equipment_types(sort_order)');
    console.log('✅ Индексы для категорий и типов созданы');

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
    
    // Заполняем справочник категорий и типов
    await seedCategoriesAndTypes();

    // Привязываем существующую технику
    await mapExistingEquipment();
    
    console.log('✅ Миграция завершена успешно!\n');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

/**
 * Начальные данные для категорий и типов техники
 */
async function seedCategoriesAndTypes() {
  // Проверяем, есть ли уже данные
  const existing = await get('SELECT COUNT(*) as count FROM equipment_categories');
  
  if (existing.count > 0) {
    console.log('\n📊 Категории уже существуют, пропускаем заполнение');
    return;
  }
  
  console.log('\n📝 Создание категорий и типов техники...');
  
  const catalog = [
    {
      name: 'Компьютерная техника',
      icon: '💻',
      description: 'Ноутбуки, системные блоки, моноблоки',
      types: [
        { name: 'Ноутбук', icon: '💻' },
        { name: 'Системный блок', icon: '🖥️' },
        { name: 'Моноблок', icon: '🖥️' },
        { name: 'Планшет', icon: '📱' },
        { name: 'Рабочая станция', icon: '🖥️' }
      ]
    },
    {
      name: 'Периферия',
      icon: '🖱️',
      description: 'Мониторы, клавиатуры, мыши, гарнитуры',
      types: [
        { name: 'Монитор', icon: '🖥️' },
        { name: 'Клавиатура', icon: '⌨️' },
        { name: 'Мышь', icon: '🖱️' },
        { name: 'Гарнитура', icon: '🎧' },
        { name: 'Веб-камера', icon: '📷' },
        { name: 'Микрофон', icon: '🎤' }
      ]
    },
    {
      name: 'Оргтехника',
      icon: '🖨️',
      description: 'Принтеры, МФУ, сканеры',
      types: [
        { name: 'Принтер', icon: '🖨️' },
        { name: 'МФУ', icon: '🖨️' },
        { name: 'Сканер', icon: '📠' },
        { name: 'Копир', icon: '📠' },
        { name: 'Шредер', icon: '🗑️' }
      ]
    },
    {
      name: 'Мобильные устройства',
      icon: '📱',
      description: 'Смартфоны и планшеты',
      types: [
        { name: 'Смартфон', icon: '📱' },
        { name: 'Планшет', icon: '📱' },
        { name: 'Умные часы', icon: '⌚' }
      ]
    },
    {
      name: 'Сетевое оборудование',
      icon: '🌐',
      description: 'Коммутаторы, маршрутизаторы, точки доступа',
      types: [
        { name: 'Коммутатор', icon: '🔀' },
        { name: 'Маршрутизатор', icon: '📡' },
        { name: 'Точка доступа', icon: '📶' },
        { name: 'Модем', icon: '📞' }
      ]
    },
    {
      name: 'Серверное оборудование',
      icon: '🖧',
      description: 'Серверы, СХД, ИБП',
      types: [
        { name: 'Сервер', icon: '🖥️' },
        { name: 'СХД', icon: '💾' },
        { name: 'ИБП', icon: '🔋' }
      ]
    },
    {
      name: 'Аксессуары',
      icon: '📎',
      description: 'Хабы, док-станции, кабели',
      types: [
        { name: 'USB-хаб', icon: '🔌' },
        { name: 'Док-станция', icon: '🔌' },
        { name: 'Кабель', icon: '🔌' },
        { name: 'Переходник', icon: '🔌' },
        { name: 'Сумка/чехол', icon: '👝' }
      ]
    },
    {
      name: 'Бытовое оборудование',
      icon: '🏢',
      description: 'Кондиционеры, холодильники, кулеры',
      types: [
        { name: 'Кондиционер', icon: '❄️' },
        { name: 'Холодильник', icon: '🧊' },
        { name: 'Кулер для воды', icon: '💧' },
        { name: 'Микроволновка', icon: '🔥' }
      ]
    }
  ];
  
  let totalCategories = 0;
  let totalTypes = 0;
  
  for (const [catIndex, catData] of catalog.entries()) {
    const catResult = await run(`
      INSERT INTO equipment_categories (name, description, icon, sort_order, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [catData.name, catData.description, catData.icon, catIndex]);
    
    totalCategories++;
    
    for (const [typeIndex, typeData] of catData.types.entries()) {
      await run(`
        INSERT INTO equipment_types (category_id, name, icon, sort_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [catResult.lastID, typeData.name, typeData.icon || null, typeIndex]);
      
      totalTypes++;
    }
    
    console.log(`   ✅ ${catData.icon} ${catData.name} (${catData.types.length} типов)`);
  }
  
  console.log(`\n✅ Создано категорий: ${totalCategories}`);
  console.log(`✅ Создано типов: ${totalTypes}`);
}

/**
 * Автопривязка существующей техники к категориям и типам
 * по совпадению с полем name
 */
async function mapExistingEquipment() {
  // Проверяем, есть ли техника без типа
  const untyped = await all(`
    SELECT id, name FROM equipment WHERE type_id IS NULL
  `);
  
  if (untyped.length === 0) {
    console.log('\n⏭️  Вся техника уже имеет категории и типы');
    return;
  }
  
  console.log(`\n🔗 Привязка ${untyped.length} единиц техники к категориям...`);
  
  let mapped = 0;
  let notMapped = 0;
  
  for (const eq of untyped) {
    // Ищем тип по имени
    const type = await get(`
      SELECT t.id as type_id, t.category_id
      FROM equipment_types t
      WHERE LOWER(t.name) = LOWER(?)
      LIMIT 1
    `, [eq.name]);
    
    if (type) {
      await run(`
        UPDATE equipment 
        SET type_id = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [type.type_id, type.category_id, eq.id]);
      mapped++;
    } else {
      console.log(`   ⚠️  Не найден тип для: "${eq.name}" (ID: ${eq.id})`);
      notMapped++;
    }
  }
  
  console.log(`\n✅ Привязано: ${mapped}`);
  if (notMapped > 0) {
    console.log(`⚠️  Не привязано: ${notMapped} (тип не найден)`);
    console.log(`   Их можно привязать вручную через админ-панель`);
  }
}

migrate();