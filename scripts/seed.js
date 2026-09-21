// scripts/seed.js
// Заполнение БД тестовыми данными

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Парсим аргументы
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const quiet = args.includes('--quiet') || args.includes('-q');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Утилиты
function log(msg, force = false) {
  if (!quiet || force) console.log(msg);
}

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

// Генерация случайной даты в прошлом
function randomDate(daysAgoMin, daysAgoMax) {
  const daysAgo = Math.floor(Math.random() * (daysAgoMax - daysAgoMin)) + daysAgoMin;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Генерация случайного элемента массива
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// ДАННЫЕ
// ============================================================

const USERS_DATA = [
  // Администраторы
  { username: 'admin', email: 'admin@company.com', full_name: 'Администратор системы', department: 'Администрация', phone: '+7(999)000-00-01', role: 'admin' },
  { username: 'manager', email: 'manager@company.com', full_name: 'Смирнов Алексей Петрович', department: 'Администрация', phone: '+7(999)000-00-02', role: 'admin' },
  
  // IT-отдел
  { username: 'ivanov', email: 'ivanov@company.com', full_name: 'Иван Иванов', department: 'IT-отдел', phone: '+7(999)111-22-33', role: 'user' },
  { username: 'kozlov', email: 'kozlov@company.com', full_name: 'Козлов Юрий Борисович', department: 'IT-отдел', phone: '+7(999)111-22-34', role: 'user' },
  { username: 'novikov', email: 'novikov@company.com', full_name: 'Новиков Дмитрий Сергеевич', department: 'IT-отдел', phone: '+7(999)111-22-35', role: 'user' },
  
  // Бухгалтерия
  { username: 'petrova', email: 'petrova@company.com', full_name: 'Мария Петрова', department: 'Бухгалтерия', phone: '+7(999)444-55-66', role: 'user' },
  { username: 'kuznetsova', email: 'kuznetsova@company.com', full_name: 'Кузнецова Ольга Ивановна', department: 'Бухгалтерия', phone: '+7(999)444-55-67', role: 'user' },
  
  // Отдел продаж
  { username: 'sidorov', email: 'sidorov@company.com', full_name: 'Пётр Сидоров', department: 'Отдел продаж', phone: '+7(999)777-88-99', role: 'user' },
  { username: 'morozov', email: 'morozov@company.com', full_name: 'Морозов Андрей Владимирович', department: 'Отдел продаж', phone: '+7(999)777-88-98', role: 'user' },
  { username: 'volkov', email: 'volkov@company.com', full_name: 'Волков Сергей Николаевич', department: 'Отдел продаж', phone: '+7(999)777-88-97', role: 'user' },
  
  // HR
  { username: 'smirnova', email: 'smirnova@company.com', full_name: 'Анна Смирнова', department: 'HR-отдел', phone: '+7(999)000-11-22', role: 'user' },
  { username: 'sokolova', email: 'sokolova@company.com', full_name: 'Соколова Екатерина Андреевна', department: 'HR-отдел', phone: '+7(999)000-11-23', role: 'user' },
  
  // Маркетинг
  { username: 'popov', email: 'popov@company.com', full_name: 'Попов Максим Олегович', department: 'Маркетинг', phone: '+7(999)222-33-44', role: 'user' },
  { username: 'lebedeva', email: 'lebedeva@company.com', full_name: 'Лебедева Наталья Викторовна', department: 'Маркетинг', phone: '+7(999)222-33-45', role: 'user' },
  
  // Логистика
  { username: 'orlov', email: 'orlov@company.com', full_name: 'Орлов Виктор Александрович', department: 'Логистика', phone: '+7(999)555-66-77', role: 'user' },
  { username: 'fedorov', email: 'fedorov@company.com', full_name: 'Фёдоров Игорь Валентинович', department: 'Логистика', phone: '+7(999)555-66-78', role: 'user' },
];

const EQUIPMENT_DATA = [
  // Ноутбуки
  { name: 'Ноутбук', model: 'Dell Latitude 5540', manufacturer: 'Dell', serial: 'DL5540-001', price_range: 'high' },
  { name: 'Ноутбук', model: 'Dell Latitude 5540', manufacturer: 'Dell', serial: 'DL5540-002', price_range: 'high' },
  { name: 'Ноутбук', model: 'HP ProBook 450 G10', manufacturer: 'HP', serial: 'HP450-001', price_range: 'high' },
  { name: 'Ноутбук', model: 'HP ProBook 450 G10', manufacturer: 'HP', serial: 'HP450-002', price_range: 'high' },
  { name: 'Ноутбук', model: 'Lenovo ThinkPad E15', manufacturer: 'Lenovo', serial: 'LNE15-001', price_range: 'high' },
  { name: 'Ноутбук', model: 'Lenovo ThinkPad E15', manufacturer: 'Lenovo', serial: 'LNE15-002', price_range: 'high' },
  { name: 'Ноутбук', model: 'Apple MacBook Air 13" M2', manufacturer: 'Apple', serial: 'MBA-M2-001', price_range: 'premium' },
  { name: 'Ноутбук', model: 'Apple MacBook Pro 14" M3', manufacturer: 'Apple', serial: 'MBP-M3-001', price_range: 'premium' },
  { name: 'Ноутбук', model: 'Asus VivoBook 15', manufacturer: 'Asus', serial: 'ASUS-VB-001', price_range: 'mid' },
  { name: 'Ноутбук', model: 'Acer Aspire 5', manufacturer: 'Acer', serial: 'ACER-AS-001', price_range: 'mid' },
  
  // Мониторы
  { name: 'Монитор', model: 'Dell UltraSharp U2723QE 27"', manufacturer: 'Dell', serial: 'DELL-U27-001', price_range: 'premium' },
  { name: 'Монитор', model: 'Dell UltraSharp U2723QE 27"', manufacturer: 'Dell', serial: 'DELL-U27-002', price_range: 'premium' },
  { name: 'Монитор', model: 'LG 27UP850 27"', manufacturer: 'LG', serial: 'LG-27UP-001', price_range: 'high' },
  { name: 'Монитор', model: 'LG 27UP850 27"', manufacturer: 'LG', serial: 'LG-27UP-002', price_range: 'high' },
  { name: 'Монитор', model: 'Samsung ViewFinity S8 27"', manufacturer: 'Samsung', serial: 'SAM-S8-001', price_range: 'high' },
  { name: 'Монитор', model: 'Acer Nitro VG271 27"', manufacturer: 'Acer', serial: 'ACER-VG-001', price_range: 'mid' },
  
  // Периферия
  { name: 'Клавиатура', model: 'Logitech MX Keys', manufacturer: 'Logitech', serial: 'LOG-MXK-001', price_range: 'mid' },
  { name: 'Клавиатура', model: 'Logitech MX Keys', manufacturer: 'Logitech', serial: 'LOG-MXK-002', price_range: 'mid' },
  { name: 'Клавиатура', model: 'Logitech MX Keys', manufacturer: 'Logitech', serial: 'LOG-MXK-003', price_range: 'mid' },
  { name: 'Мышь', model: 'Logitech MX Master 3S', manufacturer: 'Logitech', serial: 'LOG-MX3-001', price_range: 'mid' },
  { name: 'Мышь', model: 'Logitech MX Master 3S', manufacturer: 'Logitech', serial: 'LOG-MX3-002', price_range: 'mid' },
  { name: 'Мышь', model: 'Logitech MX Master 3S', manufacturer: 'Logitech', serial: 'LOG-MX3-003', price_range: 'mid' },
  { name: 'Гарнитура', model: 'Jabra Evolve2 65', manufacturer: 'Jabra', serial: 'JAB-EV2-001', price_range: 'mid' },
  { name: 'Гарнитура', model: 'Jabra Evolve2 65', manufacturer: 'Jabra', serial: 'JAB-EV2-002', price_range: 'mid' },
  { name: 'Веб-камера', model: 'Logitech Brio 4K', manufacturer: 'Logitech', serial: 'LOG-BRIO-001', price_range: 'mid' },
  
  // Мобильные
  { name: 'Смартфон', model: 'Apple iPhone 14', manufacturer: 'Apple', serial: 'IPH14-001', price_range: 'premium' },
  { name: 'Смартфон', model: 'Samsung Galaxy S23', manufacturer: 'Samsung', serial: 'SAM-S23-001', price_range: 'premium' },
  { name: 'Планшет', model: 'Apple iPad Air 5', manufacturer: 'Apple', serial: 'IPAD-5-001', price_range: 'high' },
  { name: 'Планшет', model: 'Samsung Galaxy Tab S8', manufacturer: 'Samsung', serial: 'SAM-TABS8-001', price_range: 'high' },
  
  // Оргтехника
  { name: 'Принтер', model: 'HP LaserJet Pro M404dn', manufacturer: 'HP', serial: 'HP-M404-001', price_range: 'mid' },
  { name: 'Принтер', model: 'Canon i-SENSYS MF443dw', manufacturer: 'Canon', serial: 'CAN-MF443-001', price_range: 'mid' },
  { name: 'МФУ', model: 'Kyocera ECOSYS M5526cdn', manufacturer: 'Kyocera', serial: 'KYO-M5526-001', price_range: 'high' },
  { name: 'Сканер', model: 'Epson WorkForce DS-530 II', manufacturer: 'Epson', serial: 'EPS-DS530-001', price_range: 'mid' },
  
  // Серверное/сетевое
  { name: 'Сервер', model: 'Dell PowerEdge R450', manufacturer: 'Dell', serial: 'DELL-R450-001', price_range: 'premium' },
  { name: 'Коммутатор', model: 'Cisco Catalyst 1000-24T', manufacturer: 'Cisco', serial: 'CIS-CAT-001', price_range: 'high' },
  { name: 'Маршрутизатор', model: 'MikroTik CCR2004', manufacturer: 'MikroTik', serial: 'MIK-CCR-001', price_range: 'high' },
  
  // Прочее
  { name: 'USB-хаб', model: 'Anker PowerExpand 8-in-1', manufacturer: 'Anker', serial: 'ANK-PE8-001', price_range: 'low' },
  { name: 'USB-хаб', model: 'Anker PowerExpand 8-in-1', manufacturer: 'Anker', serial: 'ANK-PE8-002', price_range: 'low' },
  { name: 'Док-станция', model: 'Dell WD19S', manufacturer: 'Dell', serial: 'DELL-WD19-001', price_range: 'high' },
  { name: 'Док-станция', model: 'Dell WD19S', manufacturer: 'Dell', serial: 'DELL-WD19-002', price_range: 'high' },
];

const DESCRIPTIONS = {
  'Ноутбук': 'Рабочий ноутбук для сотрудника',
  'Монитор': 'Монитор для рабочего места',
  'Клавиатура': 'Беспроводная клавиатура',
  'Мышь': 'Беспроводная эргономичная мышь',
  'Гарнитура': 'Гарнитура для звонков и видеоконференций',
  'Веб-камера': 'Веб-камера 4K для видеоконференций',
  'Смартфон': 'Корпоративный смартфон',
  'Планшет': 'Планшет для работы с документами',
  'Принтер': 'Лазерный принтер для офиса',
  'МФУ': 'Многофункциональное устройство',
  'Сканер': 'Сканер документов',
  'Сервер': 'Сервер для внутренних сервисов',
  'Коммутатор': 'Сетевой коммутатор',
  'Маршрутизатор': 'Маршрутизатор для офисной сети',
  'USB-хаб': 'USB-хаб для подключения периферии',
  'Док-станция': 'Док-станция для ноутбука'
};

const CONDITIONS = ['В хорошем состоянии', 'Новая', 'Требуется внимание', 'С дефектами'];

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

async function checkExisting() {
  const usersCount = await get('SELECT COUNT(*) as count FROM users');
  const equipmentCount = await get('SELECT COUNT(*) as count FROM equipment');
  
  return {
    users: usersCount.count,
    equipment: equipmentCount.count
  };
}

async function clearData() {
  log('\n🗑️  Очистка старых данных...', true);
  
  // Отключаем foreign keys на время очистки
  await run('PRAGMA foreign_keys = OFF');
  
  // Удаляем данные
  await run('DELETE FROM activity_log');
  await run('DELETE FROM user_equipment');
  await run('DELETE FROM equipment');
  await run('DELETE FROM users');
  
  // Сбрасываем счётчики автоинкремента
  await run(`DELETE FROM sqlite_sequence WHERE name IN ('users', 'equipment', 'user_equipment', 'activity_log')`);
  
  await run('PRAGMA foreign_keys = ON');
  
  // 🆕 Обновляем версию БД — все старые сессии станут невалидными
  const newVersion = Date.now().toString();
  await run(`
    INSERT INTO app_meta (key, value, updated_at) 
    VALUES ('db_seed_version', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET 
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `, [newVersion]);
  log(`   ✅ Версия БД обновлена: ${newVersion}`, true);
  
  // 🆕 Удаляем файл сессий целиком
  await clearSessionsFile();
  
  log('   ✅ Данные очищены', true);
}

/**
 * Удалить файл сессий
 */
async function clearSessionsFile() {
  const sessionsPath = path.join(dataDir, 'sessions.db');
  const sessionsJournalPath = sessionsPath + '-journal';
  const sessionsWalPath = sessionsPath + '-wal';
  const sessionsShmPath = sessionsPath + '-shm';
  
  const filesToDelete = [sessionsPath, sessionsJournalPath, sessionsWalPath, sessionsShmPath];
  
  let deletedCount = 0;
  
  for (const filePath of filesToDelete) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        log(`   ⚠️  Не удалось удалить ${path.basename(filePath)}: ${err.message}`, true);
        log(`      Возможно, сервер ещё запущен. Остановите его и повторите.`, true);
      }
    }
  }
  
  if (deletedCount > 0) {
    log(`   ✅ Файлы сессий удалены (${deletedCount})`, true);
  } else {
    log(`   ℹ️  Файлов сессий не найдено`, true);
  }
}

async function createUsers() {
  log('\n👥 Создание пользователей...', true);
  
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const userHash = await bcrypt.hash('ChangeMe123!', 10);
  
  const createdUsers = [];
  
  for (const userData of USERS_DATA) {
    const hash = userData.role === 'admin' ? adminHash : userHash;
    
    const result = await run(`
      INSERT INTO users (username, email, full_name, department, phone, password_hash, role, is_active, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `, [
      userData.username,
      userData.email,
      userData.full_name,
      userData.department,
      userData.phone,
      hash,
      userData.role
    ]);
    
    createdUsers.push({ ...userData, id: result.lastID });
    log(`   ✅ ${userData.role === 'admin' ? '👑' : '👤'} ${userData.username} (${userData.full_name})`, true);
  }
  
  return createdUsers;
}

async function createEquipment() {
  log('\n📦 Создание техники...', true);
  
  const createdEquipment = [];
  let counter = 1;
  
  for (const eqData of EQUIPMENT_DATA) {
    const inventoryNumber = `EQ-${String(counter).padStart(4, '0')}`;
    
    // Дата покупки: от 30 до 730 дней назад
    const purchaseDate = randomDate(30, 730);
    
    // Гарантия: +1, +2 или +3 года от даты покупки
    const warrantyYears = Math.floor(Math.random() * 3) + 1;
    const purchaseDateObj = new Date(purchaseDate);
    const warrantyDate = new Date(purchaseDateObj);
    warrantyDate.setFullYear(warrantyDate.getFullYear() + warrantyYears);
    const warrantyUntil = warrantyDate.toISOString().slice(0, 10);
    
    const status = Math.random() < 0.6 ? 'assigned' : 'available';
    const description = DESCRIPTIONS[eqData.name] || 'Оборудование';
    
    const result = await run(`
      INSERT INTO equipment 
      (inventory_number, name, model, serial_number, manufacturer, 
       purchase_date, warranty_until, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inventoryNumber,
      eqData.name,
      eqData.model,
      eqData.serial,
      eqData.manufacturer,
      purchaseDate.slice(0, 10),
      warrantyUntil,
      status,
      description
    ]);
    
    createdEquipment.push({ 
      ...eqData, 
      id: result.lastID, 
      inventory_number: inventoryNumber,
      status,
      purchase_date: purchaseDate.slice(0, 10)
    });
    
    counter++;
  }
  
  log(`   ✅ Создано ${createdEquipment.length} единиц техники`, true);
  return createdEquipment;
}

async function createAssignments(users, equipment) {
  log('\n📋 Создание назначений...', true);
  
  // Отделяем админов и обычных пользователей
  const regularUsers = users.filter(u => u.role === 'user');
  
  let assignmentsCreated = 0;
  let returnsCreated = 0;
  
  // Получаем только assigned технику
  const assignedEquipment = equipment.filter(e => e.status === 'assigned');
  
  for (const eq of assignedEquipment) {
    // Случайный пользователь (не админ)
    const user = random(regularUsers);
    
    const assignedDate = randomDate(5, 180);
    const conditionOnAssign = random(CONDITIONS);
    
    // Создаём активное назначение
    const result = await run(`
      INSERT INTO user_equipment (user_id, equipment_id, assigned_date, condition_on_assign, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      user.id,
      eq.id,
      assignedDate,
      conditionOnAssign,
      'Назначено при первичном вводе'
    ]);
    
    assignmentsCreated++;
  }
  
  // Добавляем историю (возвращённые назначения) для части техники
  const availableEquipment = equipment.filter(e => e.status === 'available');
  
  for (let i = 0; i < Math.min(15, availableEquipment.length); i++) {
    const eq = availableEquipment[i];
    
    // Одно или два возвращённых назначения
    const count = Math.floor(Math.random() * 2) + 1;
    
    for (let j = 0; j < count; j++) {
      const user = random(regularUsers);
      const assignedDate = randomDate(60, 365);
      const returnedDate = randomDate(5, 55);
      
      if (returnedDate < assignedDate) continue;
      
      await run(`
        INSERT INTO user_equipment 
        (user_id, equipment_id, assigned_date, returned_date, condition_on_assign, condition_on_return, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        eq.id,
        assignedDate,
        returnedDate,
        random(CONDITIONS),
        random(CONDITIONS),
        'Возвращено при плановой замене'
      ]);
      
      returnsCreated++;
    }
  }
  
  log(`   ✅ Активных назначений: ${assignmentsCreated}`, true);
  log(`   ✅ Возвращённых назначений: ${returnsCreated}`, true);
}

async function createActivityLog(users) {
  log('\n📊 Создание логов активности...', true);
  
  const actions = [
    { action: 'login', weight: 50 },
    { action: 'logout', weight: 40 },
    { action: 'equipment_update', weight: 15 },
    { action: 'equipment_assign', weight: 20 },
    { action: 'equipment_return', weight: 10 },
    { action: 'user_create', weight: 5 },
    { action: 'user_update', weight: 5 },
    { action: 'profile_update', weight: 8 },
    { action: 'password_change', weight: 3 },
  ];
  
  // Разворачиваем в массив по весам
  const weightedActions = [];
  actions.forEach(a => {
    for (let i = 0; i < a.weight; i++) weightedActions.push(a.action);
  });
  
  const totalLogs = 150;
  let created = 0;
  
  for (let i = 0; i < totalLogs; i++) {
    const user = random(users);
    const action = random(weightedActions);
    const daysAgo = Math.random() * 30;
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - daysAgo);
    logDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
    
    const createdAt = logDate.toISOString().slice(0, 19).replace('T', ' ');
    
    let details = null;
    if (action === 'login') {
      details = JSON.stringify({ role: user.role });
    } else if (action === 'equipment_assign' || action === 'equipment_return') {
      details = JSON.stringify({ inventory_number: `EQ-${String(Math.floor(Math.random() * 40) + 1).padStart(4, '0')}` });
    } else if (action === 'user_create' || action === 'user_update') {
      details = JSON.stringify({ username: `user${Math.floor(Math.random() * 100)}` });
    }
    
    await run(`
      INSERT INTO activity_log (user_id, username, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      user.username,
      action,
      details,
      '127.0.0.1',
      createdAt
    ]);
    
    created++;
  }
  
  log(`   ✅ Создано ${created} записей логов`, true);
}

async function seed() {
  try {
    console.log('');
    console.log('🌱 ═══════════════════════════════════════════════════');
    console.log('🌱  Заполнение базы данных тестовыми данными');
    console.log('🌱 ═══════════════════════════════════════════════════');
    
    // Проверяем, есть ли уже данные
    const existing = await checkExisting();
    
    if ((existing.users > 0 || existing.equipment > 0) && !force) {
      console.log('');
      console.log('⚠️  В базе данных уже есть данные:');
      console.log(`   👥 Пользователей: ${existing.users}`);
      console.log(`   📦 Техники:       ${existing.equipment}`);
      console.log('');
      console.log('   Для перезаписи используйте:');
      console.log('   npm run seed -- --force');
      console.log('');
      process.exit(0);
    }
    
    if (force && (existing.users > 0 || existing.equipment > 0)) {
      await clearData();
    }
    
    // Создаём данные
    const users = await createUsers();
    const equipment = await createEquipment();
    await createAssignments(users, equipment);
    await createActivityLog(users);
    
    // Итоги
    console.log('');
    console.log('🌱 ═══════════════════════════════════════════════════');
    console.log('✅ База данных успешно заполнена!');
    console.log('🌱 ═══════════════════════════════════════════════════');
    console.log('');
    console.log('👥 Пользователи:');
    console.log('   👑 Админы (пароль Admin123!):');
    console.log('      • admin');
    console.log('      • manager');
    console.log('');
    console.log('   👤 Обычные пользователи (пароль ChangeMe123!):');
    console.log('      • ivanov, kozlov, novikov, petrova, kuznetsova,');
    console.log('      • sidorov, morozov, volkov, smirnova, sokolova,');
    console.log('      • popov, lebedeva, orlov, fedorov');
    console.log('');
    console.log('📦 Техника: 40 единиц (разные категории)');
    console.log('');
    console.log('⚠️  ВСЕМ пользователям при первом входе');
    console.log('    будет предложено сменить пароль.');
    console.log('');
    console.log('🌱 ═══════════════════════════════════════════════════');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Ошибка при заполнении БД:', error);
    console.error('');
    process.exit(1);
  } finally {
    db.close();
  }
}

seed();