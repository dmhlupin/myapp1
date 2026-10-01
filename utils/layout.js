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
 * Собрать полную HTML-страницу с layout
 * 
 * @param {Object} options
 * @param {string} options.title — заголовок страницы
 * @param {string} options.content — HTML контент страницы
 * @param {string} [options.pageCss] — путь к CSS конкретной страницы (опционально)
 * @param {string} [options.pageJs] — путь к JS конкретной страницы (опционально)
 * @param {string} [options.bodyClass] — класс для body
 * @returns {string} — полный HTML
 */
function renderPage(options) {
    const {
        title = 'MoveIT service',
        content = '',
        pageCss = null,
        pageJs = null,
        bodyClass = '',
    } = options;
    
    const partials = loadPartials();
    
    // Дополнительные CSS/JS
    const extraCss = pageCss ? `<link rel="stylesheet" href="${pageCss}">` : '';
    const extraJs = pageJs ? `<script src="${pageJs}"></script>` : '';
    
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
        ${partials.sidebar}
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
    renderPage,
    sendPage,
    loadPartials,
    clearCache,
};