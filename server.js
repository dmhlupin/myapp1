// server.js
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const { initDatabase, closeDatabase } = require('./database/db');

// Роуты
const renderIndex = require('./routes/index');
const renderUsers = require('./routes/users');
const { renderPdfList, renderPdfFile } = require('./routes/pdf');
const renderEquipmentDashboard = require('./routes/equipment');
const {
  renderAdmin,
  getEquipmentAPI,
  getEquipmentByIdAPI,
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
  renderAddUser,
  renderEditUser
} = require('./routes/admin');

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

// Middleware
const {
  requireAuth,
  requireAdmin,
  requireGuest,
  loadUser,
  checkPasswordChange
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
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    httpOnly: true,
    secure: false, // true только для HTTPS в production
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

// ===== ПРОВЕРКА НЕОБХОДИМОСТИ СМЕНЫ ПАРОЛЯ =====
app.use(checkPasswordChange);

// ===== ИНИЦИАЛИЗАЦИЯ БД =====
initDatabase()
  .then(() => {
    console.log('✅ База данных инициализирована');
  })
  .catch(err => {
    console.error('❌ Ошибка инициализации БД:', err);
  });

// ============================================
// РОУТЫ АВТОРИЗАЦИИ (публичные)
// ============================================
app.get('/login', requireGuest, renderLogin);
app.get('/logout', logoutRedirect);
app.get('/change-password', requireAuth, renderChangePassword);

// API авторизации
app.post('/api/auth/login', requireGuest, loginAPI);
app.post('/api/auth/logout', logoutAPI);
app.post('/api/auth/change-password', requireAuth, changePasswordAPI);
app.get('/api/auth/me', requireAuth, getCurrentUserAPI);

// ============================================
// ОСНОВНЫЕ РОУТЫ (защищённые)
// ============================================
app.get('/', requireAuth, renderIndex);
app.get('/users', requireAuth, renderUsers);
app.get('/pdf', requireAuth, renderPdfList);
app.get('/pdf/:filename', requireAuth, renderPdfFile);
app.get('/equipment', requireAuth, renderEquipmentDashboard);

// ============================================
// АДМИН-ПАНЕЛЬ (пока только requireAuth, requireAdmin добавим на Этапе 4)
// ============================================
app.get('/admin', requireAuth, renderAdmin);
app.get('/admin/add', requireAuth, renderAddEquipment);
app.get('/admin/edit/:id', requireAuth, renderEditEquipment);
app.get('/admin/user/add', requireAuth, renderAddUser);
app.get('/admin/user/edit/:id', requireAuth, renderEditUser);

// ============================================
// API ДЛЯ ТЕХНИКИ (пока только requireAuth)
// ============================================
app.get('/api/admin/equipment', requireAuth, getEquipmentAPI);
app.get('/api/admin/equipment/:id', requireAuth, getEquipmentByIdAPI);
app.post('/api/admin/equipment', requireAuth, addEquipmentAPI);
app.put('/api/admin/equipment/:id', requireAuth, updateEquipmentAPI);
app.delete('/api/admin/equipment/:id', requireAuth, deleteEquipmentAPI);

// ============================================
// API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (пока только requireAuth)
// ============================================
app.get('/api/admin/users', requireAuth, getUsersAPI);
app.get('/api/admin/users/:id', requireAuth, getUserByIdAPI);
app.post('/api/admin/users', requireAuth, addUserAPI);
app.put('/api/admin/users/:id', requireAuth, updateUserAPI);
app.delete('/api/admin/users/:id', requireAuth, deleteUserAPI);

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log(`🚀  Сервер запущен: http://localhost:${PORT}`);
  console.log('🚀 ============================================');
  console.log(`📖  Главная:            http://localhost:${PORT}/`);
  console.log(`🔐  Вход:               http://localhost:${PORT}/login`);
  console.log(`👥  Пользователи:       http://localhost:${PORT}/users`);
  console.log(`🔧  Техника:            http://localhost:${PORT}/equipment`);
  console.log(`📑  PDF инструкции:     http://localhost:${PORT}/pdf`);
  console.log(`⚙️   Админ-панель:       http://localhost:${PORT}/admin`);
  console.log('🚀 ============================================');
  console.log('');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', async () => {
  console.log('\n👋 Остановка сервера...');
  await closeDatabase();
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

module.exports = app;