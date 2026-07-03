// public/js/help.js - Универсальный компонент помощи

function showHelpModal() {
    // Удаляем существующее модальное окно, если оно есть
    const existingModal = document.querySelector('.help-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'help-modal-overlay';
    modal.innerHTML = `
        <div class="help-modal">
            <div class="help-modal-header">
                <span class="help-modal-icon">📖</span>
                <h2>Справка по системе учета техники</h2>
                <button class="help-modal-close" onclick="closeHelpModal()">✕</button>
            </div>
            <div class="help-modal-body">
                <div class="help-section">
                    <h3>👥 Учет пользователей</h3>
                    <ul>
                        <li>Просмотр всех пользователей</li>
                        <li>Информация о выданной технике</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>🔧 Учет техники</h3>
                    <ul>
                        <li>Просмотр всей техники</li>
                        <li>Текущий статус техники</li>
                        <li>Информация о назначении</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>⚙️ Админ-панель</h3>
                    <ul>
                        <li>Управление техникой: добавление, редактирование, удаление</li>
                        <li>Управление пользователями: добавление, редактирование, удаление</li>
                        <li>Назначение техники пользователям</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>📑 Инструкции</h3>
                    <ul>
                        <li>PDF файлы с инструкциями</li>
                        <li>Документация по работе с системой</li>
                    </ul>
                </div>
                <div class="help-section help-tip">
                    <span class="tip-icon">💡</span>
                    <p>Для получения доступа к админ-панели обратитесь к администратору.</p>
                </div>
            </div>
            <div class="help-modal-footer">
                <button class="help-modal-btn" onclick="closeHelpModal()">Понятно</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Добавляем стили для модального окна, если их еще нет
    if (!document.getElementById('help-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'help-modal-styles';
        style.textContent = `
            .help-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: helpFadeIn 0.3s ease;
            }
            
            @keyframes helpFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .help-modal {
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: helpSlideUp 0.3s ease;
            }
            
            @keyframes helpSlideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .help-modal-header {
                padding: 20px 25px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 12px;
                position: sticky;
                top: 0;
                background: white;
                border-radius: 16px 16px 0 0;
                z-index: 1;
            }
            
            .help-modal-header h2 {
                flex: 1;
                font-size: 18px;
                color: #2d3748;
                margin: 0;
            }
            
            .help-modal-icon {
                font-size: 24px;
            }
            
            .help-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                color: #a0aec0;
                cursor: pointer;
                padding: 5px 10px;
                border-radius: 6px;
                transition: all 0.2s;
            }
            
            .help-modal-close:hover {
                background: #f7fafc;
                color: #4a5568;
            }
            
            .help-modal-body {
                padding: 25px;
            }
            
            .help-section {
                margin-bottom: 20px;
            }
            
            .help-section h3 {
                color: #2d3748;
                font-size: 15px;
                margin-bottom: 8px;
            }
            
            .help-section ul {
                margin: 0;
                padding-left: 20px;
                color: #4a5568;
                font-size: 14px;
                line-height: 1.8;
            }
            
            .help-section ul li {
                list-style-type: disc;
            }
            
            .help-tip {
                background: #ebf8ff;
                padding: 15px;
                border-radius: 8px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 0;
            }
            
            .tip-icon {
                font-size: 20px;
            }
            
            .help-tip p {
                margin: 0;
                color: #2a4365;
                font-size: 14px;
            }
            
            .help-modal-footer {
                padding: 15px 25px;
                border-top: 1px solid #e2e8f0;
                text-align: right;
            }
            
            .help-modal-btn {
                padding: 8px 25px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .help-modal-btn:hover {
                background: #5a67d8;
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }
}

function closeHelpModal() {
    const modal = document.querySelector('.help-modal-overlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Закрытие по клику на оверлей
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('help-modal-overlay')) {
        closeHelpModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeHelpModal();
    }
});