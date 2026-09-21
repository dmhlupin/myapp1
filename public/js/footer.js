// public/js/footer.js — Компонент футера

// Кеш версии (чтобы не запрашивать каждый раз)
let cachedVersion = null;

/**
 * Загрузить версию с сервера (один раз)
 */
async function fetchVersion() {
    if (cachedVersion !== null) return cachedVersion;
    
    try {
        const response = await fetch('/api/version');
        const data = await response.json();
        cachedVersion = data.version || '?.?.?';
        return cachedVersion;
    } catch (error) {
        console.warn('⚠️ Не удалось получить версию:', error);
        cachedVersion = '?.?.?';
        return cachedVersion;
    }
}

/**
 * Отрисовать футер
 */
async function renderFooter() {
    // Проверяем, есть ли уже футер
    if (document.querySelector('.help-footer')) {
        // Если футер уже есть — просто обновляем версию
        await updateFooterVersion();
        return;
    }
    
    const version = await fetchVersion();
    
    const footerHTML = `
        <div class="help-footer">
            <div class="footer-info">
                ⚡ Node.js + Express + SQLite &nbsp;·&nbsp; Версия ${version}
            </div>
            <div class="footer-links">
                <a href="/pdf" class="footer-link">
                    <span class="icon">📑</span>
                    Инструкции
                    <span class="badge">PDF</span>
                </a>
                <button onclick="showHelpModal()" class="footer-link" style="border: none; cursor: pointer; font-family: inherit; background: #f7fafc;">
                    <span class="icon">❓</span>
                    Помощь
                    <span class="badge">FAQ</span>
                </button>
            </div>
        </div>
    `;
    
    const container = document.getElementById('footer-container');
    if (container) {
        container.innerHTML = footerHTML;
    }
}

/**
 * Обновить версию в существующем футере
 */
async function updateFooterVersion() {
    const version = await fetchVersion();
    const footerInfo = document.querySelector('.footer-info');
    if (footerInfo) {
        footerInfo.innerHTML = `⚡ Node.js + Express + SQLite &nbsp;·&nbsp; Версия ${version}`;
    }
}

// Автоматический запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    renderFooter();
});