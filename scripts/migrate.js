// scripts/migrate.js
// Миграция базы данных: структура + наполнение справочника

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// ============================================================
// ПРОМИС-ОБЁРТКИ ДЛЯ SQLITE
// ============================================================

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

// ============================================================
// УТИЛИТЫ
// ============================================================

async function tableExists(table) {
  const result = await get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table]
  );
  return !!result;
}

async function columnExists(table, column) {
  const columns = await all(`PRAGMA table_info(${table})`);
  return columns.some(c => c.name === column);
}

/**
 * Добавить поле, если его нет
 */
async function addColumnIfMissing(table, column, definition) {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`  ⏭️  Поле уже есть: ${table}.${column}`);
    return false;
  }
  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  ✅ Добавлено поле: ${table}.${column}`);
  return true;
}

/**
 * Создать индекс, если его нет
 */
async function createIndexIfMissing(indexName, table, columns, extra = '') {
  await run(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${columns}) ${extra}`);
}

// ============================================================
// ЭТАП 1: СОЗДАНИЕ ТАБЛИЦ
// ============================================================

async function createUsersTable() {
  const exists = await tableExists('users');
  
  if (!exists) {
    console.log('📋 Создание таблицы users...');
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
    console.log('✅ Таблица users создана\n');
    return;
  }
  
  console.log('📋 Таблица users существует, проверяем поля...');
  
  await addColumnIfMissing('users', 'password_hash', 'TEXT');
  await addColumnIfMissing('users', 'role', `TEXT NOT NULL DEFAULT 'user'`);
  await addColumnIfMissing('users', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfMissing('users', 'must_change_password', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('users', 'last_login', 'DATETIME');
  console.log('');
}

async function createEquipmentTable() {
  const exists = await tableExists('equipment');
  
  if (!exists) {
    console.log('📋 Создание таблицы equipment...');
    await run(`
      CREATE TABLE equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        model TEXT,
        serial_number TEXT,
        manufacturer TEXT,
        purchase_date DATE,
        warranty_until DATE,
        status TEXT DEFAULT 'available',
        description TEXT,
        category_id INTEGER REFERENCES equipment_categories(id) ON DELETE SET NULL,
        type_id INTEGER REFERENCES equipment_types(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица equipment создана\n');
    return;
  }
  
  console.log('📋 Таблица equipment существует, проверяем поля...');
  await addColumnIfMissing('equipment', 'category_id', 'INTEGER REFERENCES equipment_categories(id) ON DELETE SET NULL');
  await addColumnIfMissing('equipment', 'type_id', 'INTEGER REFERENCES equipment_types(id) ON DELETE SET NULL');
  console.log('');
}

async function createUserEquipmentTable() {
  const exists = await tableExists('user_equipment');
  
  if (exists) {
    console.log('⏭️  Таблица user_equipment уже существует\n');
    return;
  }
  
  console.log('📋 Создание таблицы user_equipment...');
  await run(`
    CREATE TABLE user_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      equipment_id INTEGER NOT NULL,
      assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      returned_date DATETIME,
      condition_on_assign TEXT,
      condition_on_return TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
      UNIQUE(user_id, equipment_id, returned_date)
    )
  `);
  console.log('✅ Таблица user_equipment создана\n');
}

async function createCategoriesTable() {
  const exists = await tableExists('equipment_categories');
  
  if (exists) {
    console.log('⏭️  Таблица equipment_categories уже существует\n');
    return;
  }
  
  console.log('📋 Создание таблицы equipment_categories...');
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
  console.log('✅ Таблица equipment_categories создана\n');
}

async function createTypesTable() {
  const exists = await tableExists('equipment_types');
  
  if (exists) {
    console.log('⏭️  Таблица equipment_types уже существует\n');
    return;
  }
  
  console.log('📋 Создание таблицы equipment_types...');
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
  console.log('✅ Таблица equipment_types создана\n');
}

async function createActivityLogTable() {
  const exists = await tableExists('activity_log');
  
  if (exists) {
    console.log('⏭️  Таблица activity_log уже существует\n');
    return;
  }
  
  console.log('📋 Создание таблицы activity_log...');
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
  console.log('✅ Таблица activity_log создана\n');
}

async function createAppMetaTable() {
  const exists = await tableExists('app_meta');
  
  if (!exists) {
    console.log('📋 Создание таблицы app_meta...');
    await run(`
      CREATE TABLE app_meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await run(`
      INSERT INTO app_meta (key, value) 
      VALUES ('db_seed_version', ?)
    `, [Date.now().toString()]);
    
    console.log('✅ Таблица app_meta создана');
    console.log('✅ Установлена начальная версия БД\n');
    return;
  }
  
  console.log('⏭️  Таблица app_meta уже существует\n');
}

async function createIndexes() {
  console.log('📋 Создание индексов...');
  
  // Пользователи
  await createIndexIfMissing('idx_users_role', 'users', 'role');
  await createIndexIfMissing('idx_users_active', 'users', 'is_active');
  
  // Техника
  await createIndexIfMissing('idx_equipment_status', 'equipment', 'status');
  await createIndexIfMissing('idx_equipment_category', 'equipment', 'category_id');
  await createIndexIfMissing('idx_equipment_type', 'equipment', 'type_id');
  await createIndexIfMissing('idx_equipment_inventory', 'equipment', 'inventory_number');
  
  // Назначения
  await createIndexIfMissing('idx_user_equipment_user', 'user_equipment', 'user_id');
  await createIndexIfMissing('idx_user_equipment_equipment', 'user_equipment', 'equipment_id');
  await createIndexIfMissing('idx_user_equipment_active', 'user_equipment', 'equipment_id, returned_date');
  
  // Справочник
  await createIndexIfMissing('idx_categories_sort', 'equipment_categories', 'sort_order');
  await createIndexIfMissing('idx_types_category', 'equipment_types', 'category_id');
  await createIndexIfMissing('idx_types_sort', 'equipment_types', 'sort_order');
  
  // Логи
  await createIndexIfMissing('idx_activity_log_user', 'activity_log', 'user_id');
  await createIndexIfMissing('idx_activity_log_action', 'activity_log', 'action');
  await createIndexIfMissing('idx_activity_log_created', 'activity_log', 'created_at DESC');
  
  console.log('✅ Индексы созданы\n');
}

// ============================================================
// ЭТАП 2: ДАННЫЕ
// ============================================================

async function ensureAdminExists() {
  const admin = await get(`SELECT id, username FROM users WHERE role = 'admin' LIMIT 1`);
  
  if (admin) {
    console.log(`👤 Администратор уже существует: ${admin.username}\n`);
    return;
  }
  
  console.log('👤 Создание администратора...');
  
  const password = 'Admin123!';
  const hash = await bcrypt.hash(password, 10);
  
  await run(`
    INSERT INTO users (username, email, full_name, password_hash, role, is_active, must_change_password)
    VALUES (?, ?, ?, ?, 'admin', 1, 1)
  `, [
    'admin',
    'admin@company.com',
    'Администратор системы',
    hash
  ]);
  
  console.log('✅ Создан администратор:');
  console.log('   Логин:  admin');
  console.log(`   Пароль: ${password}`);
  console.log('   ⚠️  Смените пароль после первого входа!\n');
}

async function setDefaultPasswordsForExistingUsers() {
  const usersWithoutPassword = await all(
    `SELECT id, username FROM users WHERE password_hash IS NULL OR password_hash = ''`
  );
  
  if (usersWithoutPassword.length === 0) {
    return;
  }
  
  console.log(`🔑 Установка пароля по умолчанию для ${usersWithoutPassword.length} пользователей...`);
  
  const password = 'ChangeMe123!';
  const hash = await bcrypt.hash(password, 10);
  
  for (const user of usersWithoutPassword) {
    await run(
      `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`,
      [hash, user.id]
    );
    console.log(`  ✅ ${user.username} — пароль: ${password}`);
  }
  
  console.log('');
}

// ============================================================
// ЭТАП 3: СПРАВОЧНИК КАТЕГОРИЙ И ТИПОВ
// ============================================================

const CATALOG_DATA = [
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
    description: 'Смартфоны, планшеты, умные часы',
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

async function seedCategoriesAndTypes() {
  const existing = await get('SELECT COUNT(*) as count FROM equipment_categories');
  
  if (existing.count > 0) {
    console.log(`📊 Категории уже существуют (${existing.count}), пропускаем заполнение\n`);
    return;
  }
  
  console.log('📝 Создание категорий и типов техники...');
  
  let totalCategories = 0;
  let totalTypes = 0;
  
  for (const [catIndex, catData] of CATALOG_DATA.entries()) {
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
  
  console.log('');
  console.log(`✅ Создано категорий: ${totalCategories}`);
  console.log(`✅ Создано типов: ${totalTypes}\n`);
}

async function mapExistingEquipment() {
  const untyped = await all(`SELECT id, name FROM equipment WHERE type_id IS NULL`);
  
  if (untyped.length === 0) {
    console.log('⏭️  Вся техника уже имеет категории и типы\n');
    return;
  }
  
  console.log(`🔗 Привязка ${untyped.length} единиц техники к категориям...`);
  
  let mapped = 0;
  let notMapped = 0;
  
  for (const eq of untyped) {
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
      console.log(`   ⚠️  Тип не найден: "${eq.name}" (ID: ${eq.id})`);
      notMapped++;
    }
  }
  
  console.log(`✅ Привязано: ${mapped}`);
  if (notMapped > 0) {
    console.log(`⚠️  Не привязано: ${notMapped}`);
    console.log(`   Привяжите вручную через админ-панель\n`);
  } else {
    console.log('');
  }
}

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ МИГРАЦИИ
// ============================================================

async function migrate() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('🔄 МИГРАЦИЯ БАЗЫ ДАННЫХ');
    console.log('═══════════════════════════════════════════════\n');
    
    // ===== ЭТАП 1: Структура БД =====
    console.log('📦 ЭТАП 1: Структура базы данных\n');
    
    await createUsersTable();
    await createCategoriesTable();       // ← должно быть ДО equipment
    await createTypesTable();            // ← должно быть ДО equipment
    await createEquipmentTable();
    await createUserEquipmentTable();
    await createActivityLogTable();
    await createAppMetaTable();
    await createIndexes();
    
    // ===== ЭТАП 2: Данные пользователей =====
    console.log('👥 ЭТАП 2: Пользователи\n');
    
    await setDefaultPasswordsForExistingUsers();
    await ensureAdminExists();
    
    // ===== ЭТАП 3: Справочник =====
    console.log('📚 ЭТАП 3: Справочник категорий и типов\n');
    
    await seedCategoriesAndTypes();
    await mapExistingEquipment();
    
    // ===== ИТОГИ =====
    console.log('═══════════════════════════════════════════════');
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО');
    console.log('═══════════════════════════════════════════════\n');
    
    // Статистика
    const stats = await get(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM equipment_categories) as categories,
        (SELECT COUNT(*) FROM equipment_types) as types,
        (SELECT COUNT(*) FROM equipment) as equipment
    `);
    
    console.log('📊 Итоговая статистика:');
    console.log(`   👥 Пользователей:  ${stats.users}`);
    console.log(`   📁 Категорий:      ${stats.categories}`);
    console.log(`   📦 Типов:          ${stats.types}`);
    console.log(`   🔧 Единиц техники: ${stats.equipment}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА МИГРАЦИИ:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// ============================================================
// ЗАПУСК
// ============================================================

migrate();