// middleware/auth.js

/**
 * Middleware: требуется авторизация
 * Если пользователь не авторизован — редирект на /login
 * Для API-запросов возвращает 401 JSON
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Если это API-запрос — возвращаем JSON
  if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept || '').includes('application/json')) {
    return res.status(401).json({ 
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    });
  }
  
  // Иначе редирект на страницу входа с сохранением исходного URL
  const returnUrl = encodeURIComponent(req.originalUrl);
  res.redirect(`/login?returnUrl=${returnUrl}`);
}

/**
 * Middleware: требуется роль администратора
 * Должен использоваться ПОСЛЕ requireAuth
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept || '').includes('application/json')) {
      return res.status(401).json({ 
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED'
      });
    }
    return res.redirect('/login');
  }
  
  if (req.session.role !== 'admin') {
    if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept || '').includes('application/json')) {
      return res.status(403).json({ 
        error: 'Недостаточно прав. Требуется роль администратора',
        code: 'FORBIDDEN'
      });
    }
    
    // Для обычных страниц — показываем страницу "Доступ запрещён"
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Доступ запрещён</title>
        <link rel="stylesheet" href="/css/style.css">
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f0f2f5;
          }
          .container {
            background: white;
            padding: 60px 50px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
          }
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #e53e3e; margin-bottom: 15px; }
          p { color: #666; margin-bottom: 25px; }
          .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
          }
          .btn:hover { background: #5a67d8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🚫</div>
          <h1>Доступ запрещён</h1>
          <p>У вас недостаточно прав для доступа к этой странице.</p>
          <a href="/" class="btn">← На главную</a>
        </div>
      </body>
      </html>
    `);
  }
  
  next();
}

/**
 * Middleware: только для неавторизованных
 * Если пользователь уже вошёл — редирект на главную
 * Используется на странице /login
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

/**
 * Middleware: передаёт данные пользователя в res.locals
 * для использования в шаблонах
 */
function loadUser(req, res, next) {
  if (req.session && req.session.userId) {
    res.locals.user = {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      fullName: req.session.fullName
    };
    res.locals.isAuthenticated = true;
    res.locals.isAdmin = req.session.role === 'admin';
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.isAdmin = false;
  }
  next();
}

/**
 * Middleware: проверяет, что пользователь должен сменить пароль
 * Если must_change_password = 1 — редирект на страницу смены пароля
 * (кроме самой страницы смены пароля и API для смены пароля)
 */
function checkPasswordChange(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next();
  }
  
  // Разрешаем доступ к странице смены пароля и выходу
  const allowedPaths = [
    '/change-password',
    '/api/auth/change-password',
    '/logout',
    '/api/auth/logout'
  ];
  
  if (allowedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  if (req.session.mustChangePassword) {
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(403).json({
        error: 'Необходимо сменить пароль',
        code: 'PASSWORD_CHANGE_REQUIRED'
      });
    }
    return res.redirect('/change-password');
  }
  
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireGuest,
  loadUser,
  checkPasswordChange
};