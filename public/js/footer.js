// public/js/footer.js - Компонент футера

function renderFooter() {
    // Проверяем, есть ли уже футер
    if (document.querySelector('.help-footer')) {
        return;
    }
    
    const footerHTML = `
        <div class="help-footer">
            <div class="footer-info">
                ⚡ Node.js + Express + SQLite &nbsp;·&nbsp; Версия 1.3.0
            </div>
            <div class="footer-links">
                <a href="/pdf" class="footer-link">
                    <span class="icon">📑</span>
                    Инструкции
                    <span class="badge">PDF</span>
                </a>
                <button onclick="showHelpModal()" class="footer-link">
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

// Автоматически рендерим футер при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    renderFooter();
});