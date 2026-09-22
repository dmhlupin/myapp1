// server.js
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const { db, closeDatabase } = require('./database/db');

// Роуты

const renderUsers = require('./routes/users');
const renderDashboard = require('./routes/dashboard');
const { renderPdfList, renderPdfFile } = require('./routes/pdf');
const renderEquipmentDashboard = require('./routes/equipment');
const {
  renderAdmin,
  renderLogs,              
  getEquipmentAPI,
  getEquipmentByIdAPI,
  getEquipmentDetailsAPI, // ← НОВОЕ
  addEquipmentAPI,
  updateEquipmentAPI,
  deleteEquipmentAPI,
  renderAddEquipment,
  renderEditEquipment,
  getUsersAPI,
  getUserByIdAPI,
  addUserAPI,
  updateUserAPI,
  deleteUserAPI,
  resetUserPasswordAPI,
  blockUserAPI,
  unblockUserAPI,
  getUserDetailsAPI,
  renderAddUser,
  renderEditUser,
  // Логи                ← НОВОЕ
  getLogsAPI,
  getLogsStatsAPI,
  cleanLogsAPI
} = require('./routes/admin');

// Роуты каталога
const {
  renderCatalog,
  getCategoriesAPI,
  getCategoryAPI,
  createCategoryAPI,
  updateCategoryAPI,
  deleteCategoryAPI,
  reorderCategoriesAPI,
  getTypesAPI,
  getTypeAPI,
  createTypeAPI,
  updateTypeAPI,
  deleteTypeAPI,
  reorderTypesAPI,
} = require('./routes/catalog');

// Роуты авторизации
const {
  renderLogin,
  renderChangePassword,
  logoutRedirect,
  loginAPI,
  logoutAPI,
  changePasswordAPI,
  getCurrentUserAPI
} = require('./routes/auth');

// Роут профиля
const {
  renderProfile,
  updateProfileAPI
} = require('./routes/profile');

// Middleware
const {
  requireAuth,
  requireAdmin,
  requireGuest,
  loadUser,
  checkPasswordChange,
  syncSession  // ← НОВОЕ
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== БАЗОВЫЕ MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== НАСТРОЙКА СЕССИЙ =====
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'data')
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  },
  name: 'equipment.sid'
}));

// ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ В RES.LOCALS =====
app.use(loadUser);

// ===== СИНХРОНИЗАЦИЯ СЕССИИ С БД =====
// На каждый запрос проверяем, что пользователь ещё существует,
// активен и не был изменён
app.use(syncSession);

// ===== ПРОВЕРКА НЕОБХОДИМОСТИ СМЕНЫ ПАРОЛЯ =====
app.use(checkPasswordChange);

// ===== ИНИЦИАЛИЗАЦИЯ БД =====
// ===== БД уже инициализирована через npm run migrate =====
// Проверка подключения

db.get('SELECT 1 as ok', (err) => {
  if (err) {
    console.error('❌ Не удалось подключиться к БД:', err.message);
    console.error('   Запустите: npm run migrate');
    process.exit(1);
  }
  console.log('✅ База данных подключена');
});

// ============================================
// РОУТЫ АВТОРИЗАЦИИ (публичные)
// ============================================
app.get('/login', requireGuest, renderLogin);
app.get('/logout', logoutRedirect);
app.get('/change-password', requireAuth, renderChangePassword);
// ============================================
// API: Информация о версии (публичный)
// ============================================
app.get('/api/version', (req, res) => {
  const pkg = require('./package.json');
  res.json({
    version: pkg.version,
    name: pkg.name,
    description: pkg.description
  });
});

app.post('/api/auth/login', requireGuest, loginAPI);
app.post('/api/auth/logout', logoutAPI);
app.post('/api/auth/change-password', requireAuth, changePasswordAPI);
app.get('/api/auth/me', requireAuth, getCurrentUserAPI);

// ============================================
// ПРОФИЛЬ (только авторизованные)
// ============================================
app.get('/profile', requireAuth, renderProfile);
app.post('/api/profile/update', requireAuth, updateProfileAPI);

// ============================================
// ОСНОВНЫЕ РОУТЫ (только авторизованные)
// ============================================
app.get('/', requireAdmin, renderDashboard);  // ← вместо requireAuth
app.get('/users', requireAuth, renderUsers);
app.get('/pdf', requireAuth, renderPdfList);
app.get('/pdf/:filename', requireAuth, renderPdfFile);
app.get('/equipment', requireAuth, renderEquipmentDashboard);

// ============================================
// АДМИН-ПАНЕЛЬ (только администраторы!)
// ============================================
app.get('/admin', requireAdmin, renderAdmin);
app.get('/admin/add', requireAdmin, renderAddEquipment);
app.get('/admin/edit/:id', requireAdmin, renderEditEquipment);
app.get('/admin/user/add', requireAdmin, renderAddUser);
app.get('/admin/user/edit/:id', requireAdmin, renderEditUser);

// ============================================
// API ДЛЯ ТЕХНИКИ (только администраторы!)
// ============================================
app.get('/api/admin/equipment', requireAdmin, getEquipmentAPI);
app.get('/api/admin/equipment/:id/details', requireAdmin, getEquipmentDetailsAPI);  // ← НОВОЕ (до :id!)
app.get('/api/admin/equipment/:id', requireAdmin, getEquipmentByIdAPI);
app.post('/api/admin/equipment', requireAdmin, addEquipmentAPI);
app.put('/api/admin/equipment/:id', requireAdmin, updateEquipmentAPI);
app.delete('/api/admin/equipment/:id', requireAdmin, deleteEquipmentAPI);

// ============================================
// ЛОГИ (только администраторы!)
// ============================================
app.get('/admin/logs', requireAdmin, renderLogs);
app.get('/api/admin/logs', requireAdmin, getLogsAPI);
app.get('/api/admin/logs/stats', requireAdmin, getLogsStatsAPI);
app.post('/api/admin/logs/clean', requireAdmin, cleanLogsAPI);

// ============================================
// СПРАВОЧНИК (только администраторы!)
// ============================================

// Страница
app.get('/admin/catalog', requireAdmin, renderCatalog);

// API категорий
app.get('/api/admin/categories', requireAdmin, getCategoriesAPI);
app.post('/api/admin/categories', requireAdmin, createCategoryAPI);
app.post('/api/admin/categories/reorder', requireAdmin, reorderCategoriesAPI); // ← ПЕРЕД :id
app.get('/api/admin/categories/:id', requireAdmin, getCategoryAPI);
app.put('/api/admin/categories/:id', requireAdmin, updateCategoryAPI);
app.delete('/api/admin/categories/:id', requireAdmin, deleteCategoryAPI);

// API типов
app.get('/api/admin/types', requireAdmin, getTypesAPI);
app.post('/api/admin/types', requireAdmin, createTypeAPI);
app.post('/api/admin/types/reorder', requireAdmin, reorderTypesAPI); // ← ПЕРЕД :id
app.get('/api/admin/types/:id', requireAdmin, getTypeAPI);
app.put('/api/admin/types/:id', requireAdmin, updateTypeAPI);
app.delete('/api/admin/types/:id', requireAdmin, deleteTypeAPI);

// ============================================
// API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (только администраторы!)
// ============================================
app.get('/api/admin/users', requireAdmin, getUsersAPI);
app.get('/api/admin/users/:id', requireAdmin, getUserByIdAPI);
app.get('/api/admin/users/:id/details', requireAdmin, getUserDetailsAPI);
app.post('/api/admin/users', requireAdmin, addUserAPI);
app.put('/api/admin/users/:id', requireAdmin, updateUserAPI);
app.delete('/api/admin/users/:id', requireAdmin, deleteUserAPI);
app.post('/api/admin/users/:id/reset-password', requireAdmin, resetUserPasswordAPI);
app.post('/api/admin/users/:id/block', requireAdmin, blockUserAPI);
app.post('/api/admin/users/:id/unblock', requireAdmin, unblockUserAPI);

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log(`🚀  Сервер запущен: http://localhost:${PORT}`);
  console.log('🚀 ============================================');
  console.log(`🔐  Вход:               http://localhost:${PORT}/login`);
  console.log(`👤  Профиль:            http://localhost:${PORT}/profile`);
  console.log(`📖  Главная:            http://localhost:${PORT}/`);
  console.log(`⚙️   Админ-панель:       http://localhost:${PORT}/admin`);
  console.log('🚀 ============================================');
  console.log('');
});

process.on('SIGINT', async () => {
  console.log('\n👋 Остановка сервера...');
  await closeDatabase();
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

module.exports = app;