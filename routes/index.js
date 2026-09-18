// routes/index.js
const fs = require('fs');
const path = require('path');

function renderIndex(req, res) {
  const htmlPath = path.join(__dirname, '..', 'views', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Получаем данные пользователя из сессии
  const user = req.session || {};
  const userName = user.fullName || user.username || 'Пользователь';
  const isAdmin = user.role === 'admin';
  
  // Заменяем плейсхолдеры
  html = html.replace(/\{\{userName\}\}/g, userName);
  html = html.replace(/\{\{isAdmin\}\}/g, isAdmin ? 'true' : 'false');
  
  res.send(html);
}

module.exports = renderIndex;