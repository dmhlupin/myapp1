// utils/layout.js
// Layout-контроллер: сборка страниц из партиалов

const fs = require('fs');
const path = require('path');

// Путь к партиалам
const PARTIALS_DIR = path.join(__dirname, '..', 'views', 'partials');

// Кэш партиалов (чтобы не читать с диска каждый раз)
let partialsCache = null;

/**
 * Загрузить все партиалы
 */
function loadPartials() {
    if (partialsCache) return partialsCache;
    
    const partials = {
        header: fs.readFileSync(path.join(PARTIALS_DIR, 'header.html'), 'utf8'),
        sidebar: fs.readFileSync(path.join(PARTIALS_DIR, 'sidebar.html'), 'utf8'),
        footer: fs.readFileSync(path.join(PARTIALS_DIR, 'footer.html'), 'utf8'),
    };
    
    partialsCache = partials;
    console.log('✅ Партиалы загружены в кэш');
    return partials;
}

/**
 * Очистить кэш (для разработки)
 */
function clearCache() {
    partialsCache = null;
    console.log('🔄 Кэш партиалов очищен');
}

/**
 * 🆕 Построить sidebar с учётом роли.
 *
 * В sidebar.html используются маркеры:
 *   {{#if admin}}...{{/if}}   — только для админа
 *   {{#if user}}...{{/if}}    — только для пользователя
 *
 * Регулярки нежадные: [\s\S]*? — чтобы корректно обрабатывать
 * несколько блоков в файле.
 */
function buildSidebar(sidebarHtml, isAdmin) {
    let html = sidebarHtml;

    // {{#if admin}}...{{/if}}
    html = html.replace(/\{\{#if admin\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, inner) => {
        return isAdmin ? inner : '';
    });

    // {{#if user}}...{{/if}}
    html = html.replace(/\{\{#if user\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, inner) => {
        return isAdmin ? '' : inner;
    });

    return html;
}

/**
 * Собрать полную HTML-страницу с layout.
 *
 * ⚠️ Для страниц, доступных не-админам, используйте renderPageFor(req, res, options):
 *   renderPage(options) без параметра `user` рендерит sidebar как для админа
 *   (обратная совместимость). Если роут доступен пользователю и вы забудете
 *   передать `user` — sidebar будет неправильным.
 *
 * @param {Object} options
 * @param {string} options.title — заголовок страницы
 * @param {string} options.content — HTML контент страницы
 * @param {string} [options.pageCss] — путь к CSS конкретной страницы
 * @param {string} [options.pageJs] — путь к JS конкретной страницы
 * @param {string} [options.bodyClass] — класс для body
 * @param {Object|null} [options.user] — { id, username, role, fullName }
 *   Если undefined — sidebar рендерится как для админа (для совместимости).
 *   Если null — как для неавторизованного/пользователя.
 * @returns {string} — полный HTML
 */

function renderPage(options) {
    const {
        title = 'MoveIT service',
        content = '',
        pageCss = null,
        pageJs = null,
        bodyClass = '',
        user = undefined,       // 🆕 { id, username, role, fullName } | null | undefined
    } = options;
    
    const partials = loadPartials();
    
    // Дополнительные CSS/JS
    const extraCss = pageCss ? `<link rel="stylesheet" href="${pageCss}">` : '';
    const extraJs = pageJs ? `<script src="${pageJs}"></script>` : '';
    
    // 🆕 Роле-зависимый sidebar.
    // Если user не передан (undefined) — считаем админом для обратной
    // совместимости. Если передан явно (в т.ч. null для неавторизованных) —
    // используем его роль.
    const isAdmin = (user === undefined) || (user && user.role === 'admin');
    const sidebar = buildSidebar(partials.sidebar, isAdmin);
    
    // Собираем HTML
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Тема (цвета, переменные) -->
    <link rel="stylesheet" href="/css/theme.css">
    
    <!-- Layout (sidebar, header, footer) -->
    <link rel="stylesheet" href="/css/layout.css">
    
    <!-- Общие компоненты -->
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/help.css">
    
    <!-- CSS конкретной страницы -->
    ${extraCss}
</head>
<body class="${bodyClass}">
    <div class="app-layout">
        ${sidebar}
        ${partials.header}
        
        <main class="app-main">
            ${content}
        </main>
        
        ${partials.footer}
    </div>

    <!-- Toast container -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- Общие скрипты -->
    <script src="/js/main.js"></script>
    <script src="/js/help.js"></script>
    <script src="/js/layout.js"></script>
    
    <!-- JS конкретной страницы -->
    ${extraJs}
</body>
</html>`;
}

/**
 * 🆕 Рекомендуемый способ рендера страниц (с роле-зависимым sidebar).
 *
 * Использование в роутах:
 *   const { renderPageFor } = require('../utils/layout');
 *   ...
 *   renderPageFor(req, res, {
 *       title: 'Профиль',
 *       content,
 *       pageCss: '/css/profile.css',
 *       pageJs: '/js/profile.js',
 *   });
 *
 * Роль берётся из req.session.role — забыть невозможно.
 * Если req.session пуста (неавторизованный) — user = null,
 * sidebar будет пользовательский.
 */
function renderPageFor(req, res, options) {
    const user = (req && req.session && req.session.userId)
        ? {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role,
            fullName: req.session.fullName,
        }
        : null;

    const html = renderPage({ ...options, user });
    res.send(html);
}

/**
 * Обёртка для рендера страницы с layout
 * Использование в роутах:
 * 
 * const { renderPage } = require('../utils/layout');
 * 
 * app.get('/equipment', async (req, res) => {
 *     const content = await renderEquipmentContent(req);
 *     const html = renderPage({
 *         title: 'Техника',
 *         content: content,
 *         pageCss: '/css/equipment.css',
 *         pageJs: '/js/equipment.js',
 *     });
 *     res.send(html);
 * });
 */
function sendPage(res, options) {
    const html = renderPage(options);
    res.send(html);
}

module.exports = {
    renderPage,      // старый способ, @deprecated — используй renderPageFor
    renderPageFor,   // 🆕 рекомендованный способ
    sendPage,
    loadPartials,
    clearCache,
};