#!/usr/bin/env node
// scripts/check-css.js
// Проверка: все ли CSS-переменные из theme.css объявлены,
// все ли нужные классы есть в components.css

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public', 'css');

// ------------------------------------------------------------
// 1. Собираем все объявленные переменные в theme.css
// ------------------------------------------------------------
function collectDeclaredVars(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');
  const declared = new Set();
  // ищем --var-name: ... ; внутри :root и любых блоков
  const re = /(--[a-zA-Z0-9-]+)\s*:/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    declared.add(m[1]);
  }
  return declared;
}

// ------------------------------------------------------------
// 2. Собираем все используемые переменные в CSS-файле
// ------------------------------------------------------------
function collectUsedVars(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');
  const used = new Set();
  const re = /var\(\s*(--[a-zA-Z0-9-]+)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    used.add(m[1]);
  }
  return used;
}

// ------------------------------------------------------------
// 3. Собираем все объявленные классы в CSS-файле
// ------------------------------------------------------------
function collectDeclaredClasses(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');
  const declared = new Set();
  // ищем .class-name (не в :not(), не в псевдоклассах)
  // упрощённо: .[\w-]+ за которым следует { , , : пробел
  const re = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    declared.add(m[1]);
  }
  return declared;
}

// ------------------------------------------------------------
// 4. Проверка переменных в CSS-файлах
// ------------------------------------------------------------
function checkVars(themeVars, files) {
  console.log('\n📦 Проверка CSS-переменных\n');
  let totalMissing = 0;

  for (const file of files) {
    const fullPath = path.join(PUBLIC, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  ${file} — не найден, пропуск`);
      continue;
    }
    const used = collectUsedVars(fullPath);
    const missing = [...used].filter(v => !themeVars.has(v));
    if (missing.length === 0) {
      console.log(`✅ ${file} — все переменные объявлены (${used.size} шт.)`);
    } else {
      console.log(`❌ ${file} — отсутствуют переменные (${missing.length}):`);
      missing.forEach(v => console.log(`     ${v}`));
      totalMissing += missing.length;
    }
  }
  return totalMissing;
}

// ------------------------------------------------------------
// 5. Проверка классов в components.css
// ------------------------------------------------------------
function checkClasses(required, filePath, fileLabel = 'components.css') {
  console.log(`\n📦 Проверка классов в ${fileLabel}\n`);
  const declared = collectDeclaredClasses(filePath);
  let totalMissing = 0;
  const byGroup = {};

  for (const [group, classes] of Object.entries(required)) {
    byGroup[group] = { ok: [], missing: [] };
    for (const cls of classes) {
      if (declared.has(cls)) {
        byGroup[group].ok.push(cls);
      } else {
        byGroup[group].missing.push(cls);
      }
    }
  }

  for (const [group, { ok, missing }] of Object.entries(byGroup)) {
    if (missing.length === 0) {
      console.log(`✅ ${group} — все классы на месте (${ok.length})`);
    } else {
      console.log(`❌ ${group} — отсутствуют (${missing.length} из ${ok.length + missing.length}):`);
      missing.forEach(c => console.log(`     .${c}`));
      totalMissing += missing.length;
    }
  }
  return totalMissing;
}

// ------------------------------------------------------------
// 6. Проверка плейсхолдеров в views/*.html
// ------------------------------------------------------------
function checkPlaceholders(viewFile, expected) {
  const fullPath = path.join(ROOT, 'views', viewFile);
  if (!fs.existsSync(fullPath)) {
    return { file: viewFile, ok: false, reason: 'не найден' };
  }
  const html = fs.readFileSync(fullPath, 'utf8');
  const missing = expected.filter(p => !html.includes(p));
  return { file: viewFile, missing };
}

// ============================================================
// MAIN
// ============================================================

console.log('🔍 Проверка CSS и шаблонов MoveIT service\n');
console.log('─'.repeat(60));

const themePath = path.join(PUBLIC, 'theme.css');
const componentsPath = path.join(PUBLIC, 'components.css');

if (!fs.existsSync(themePath)) {
  console.error('❌ theme.css не найден');
  process.exit(1);
}
if (!fs.existsSync(componentsPath)) {
  console.error('❌ components.css не найден');
  process.exit(1);
}

// --- 1. Переменные ---
const themeVars = collectDeclaredVars(themePath);
console.log(`\n📋 Объявлено переменных в theme.css: ${themeVars.size}\n`);

const cssFilesToCheck = [
  'admin-add.css',
  'admin-edit.css',
  'catalog.css',
  'logs.css',
  'components.css',
  'layout.css',
  'warehouses.css',
  'warehouse-details.css',
];

const missingVars = checkVars(themeVars, cssFilesToCheck);

// --- 2. Классы в components.css ---
console.log('\n' + '─'.repeat(60));
console.log('📋 Объявлено классов в components.css: ' + collectDeclaredClasses(componentsPath).size);

// Классы, которые должны быть в components.css
const requiredInComponents = {
  'Формы (1.6.3)': [
    'required',
    'help-text',
  ],
  'Модалки (существующие)': [
    'modal-overlay',
    'modal',
    'modal-header',
    'modal-close',
    'modal-actions',
  ],
  'Info-боксы (1.7.1)': [
    'info-box',
    'info-box-icon',
  ],
  'Пароль (1.7.1)': [
    'password-warning',
    'password-display',
    'password-username',
  ],
  'Общие компоненты': [
    'card',
    'card-header',
    'card-title',
    'card-body',
    'form-group',
    'form-row',
    'form-actions',
    'btn',
    'btn-primary',
    'btn-ghost',
    'btn-sm',
  ],
};

// Классы, которые должны быть в layout.css
const requiredInLayout = {
  'Каркас страницы': [
    'page-header',
    'page-title',
    'page-subtitle',
    'page-actions',
  ],
  'Общий каркас (проверка)': [
    'app-layout',
    'app-sidebar',
    'app-header',
    'app-main',
    'app-footer',
  ],
};

const missingClassesComponents = checkClasses(requiredInComponents, componentsPath, 'components.css');
console.log('\n' + '─'.repeat(60));
const layoutPath = path.join(PUBLIC, 'layout.css');
const missingClassesLayout = checkClasses(requiredInLayout, layoutPath, 'layout.css');
const missingClasses = missingClassesComponents + missingClassesLayout;

// --- 3. Плейсхолдеры в шаблонах ---
console.log('\n' + '─'.repeat(60));
console.log('📦 Проверка плейсхолдеров в views/\n');

const placeholderChecks = [
  {
    file: 'admin-user-add.html',
    expected: ['id="username"', 'id="email"', 'id="full_name"', 'id="department"',
               'id="phone"', 'id="role"', 'id="submitBtn"', 'id="passwordModal"',
               'id="tempPasswordValue"', 'id="passwordUsername"',
               'id="addUserForm"', 'class="modal-overlay"', 'class="modal"',
               'class="modal-header"', 'class="modal-actions"'],
  },
  {
    file: 'admin-user-edit.html',
    expected: ['id="userId"', 'id="currentRole"', 'id="username"', 'id="email"',
               'id="full_name"', 'id="department"', 'id="phone"', 'id="role"',
               'id="submitBtn"', 'id="editUserForm"', '{{id}}', '{{role}}',
               '{{username}}', '{{email}}'],
  },
  {
    file: 'admin-add.html',
    expected: ['id="addForm"', 'id="inventory_number"', 'id="category_id"',
               'id="type_id"', 'id="name"', 'id="warehouseId"', 'id="zoneId"',
               'id="rackId"', 'id="cellId"', 'id="submitBtn"',
               'class="form-actions"', 'class="card"'],
  },
  {
    file: 'admin-edit.html',
    expected: ['id="equipmentId"', 'id="currentStatus"', 'id="currentCategoryId"',
               'id="currentTypeId"', 'id="currentCellId"', 'id="statusWarning"',
               'id="statusInfo"', 'id="assignSection"', 'id="submitBtn"',
               '{{status_options}}', '{{user_options}}'],
  },
];

let totalPlaceholderIssues = 0;
for (const check of placeholderChecks) {
  const result = checkPlaceholders(check.file, check.expected);
  if (result.reason) {
    console.log(`⚠️  ${result.file} — ${result.reason}`);
  } else if (result.missing.length === 0) {
    console.log(`✅ ${result.file} — все плейсхолдеры на месте (${check.expected.length})`);
  } else {
    console.log(`❌ ${result.file} — отсутствуют (${result.missing.length}):`);
    result.missing.forEach(p => console.log(`     ${p}`));
    totalPlaceholderIssues += result.missing.length;
  }
}

// ------------------------------------------------------------
// ИТОГ
// ------------------------------------------------------------
console.log('\n' + '─'.repeat(60));
console.log('📊 ИТОГ\n');

const totalIssues = missingVars + missingClasses + totalPlaceholderIssues;

if (totalIssues === 0) {
  console.log('✅ Все проверки пройдены. Можно коммитить.\n');
  process.exit(0);
} else {
  console.log(`❌ Найдено проблем: ${totalIssues}`);
  console.log(`   • Переменные theme.css:       ${missingVars}`);
  console.log(`   • Классы components.css:      ${missingClasses}`);
  console.log(`   • Плейсхолдеры в views/:      ${totalPlaceholderIssues}`);
  console.log('\nПоправь и запусти снова.\n');
  process.exit(1);
}