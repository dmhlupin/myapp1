const express = require('express');
const path = require('path');
const { initDatabase, closeDatabase } = require('./database/db');
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статических файлов
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Инициализация БД
initDatabase()
  .then(() => {
    console.log('✅ База данных инициализирована');
  })
  .catch(err => {
    console.error('❌ Ошибка инициализации БД:', err);
  });

// ===== ОСНОВНЫЕ МАРШРУТЫ =====
app.get('/', renderIndex);
app.get('/users', renderUsers);
app.get('/pdf', renderPdfList);
app.get('/pdf/:filename', renderPdfFile);
app.get('/equipment', renderEquipmentDashboard);

// ===== АДМИН-ПАНЕЛЬ (СТРАНИЦЫ) =====
app.get('/admin', renderAdmin);
app.get('/admin/add', renderAddEquipment);
app.get('/admin/edit/:id', renderEditEquipment);
app.get('/admin/user/add', renderAddUser);
app.get('/admin/user/edit/:id', renderEditUser);

// ===== API ДЛЯ ТЕХНИКИ =====
app.get('/api/admin/equipment', getEquipmentAPI);
app.get('/api/admin/equipment/:id', getEquipmentByIdAPI);
app.post('/api/admin/equipment', addEquipmentAPI);
app.put('/api/admin/equipment/:id', updateEquipmentAPI);
app.delete('/api/admin/equipment/:id', deleteEquipmentAPI);

// ===== API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====
app.get('/api/admin/users', getUsersAPI);
app.get('/api/admin/users/:id', getUserByIdAPI);
app.post('/api/admin/users', addUserAPI);
app.put('/api/admin/users/:id', updateUserAPI);
app.delete('/api/admin/users/:id', deleteUserAPI);

// ===== ЗАПУСК СЕРВЕРА =====
const server = app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📖 Главная страница: http://localhost:${PORT}/`);
  console.log(`👥 Учет пользователей: http://localhost:${PORT}/users`);
  console.log(`📑 PDF инструкции: http://localhost:${PORT}/pdf`);
  console.log(`🔧 Учет техники: http://localhost:${PORT}/equipment`);
  console.log(`⚙️  Админ-панель: http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Остановка сервера...');
  await closeDatabase();
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

module.exports = app;