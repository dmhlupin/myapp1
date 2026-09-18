// public/js/logs.js — Логика страницы логов

/**
 * Очистка старых логов
 */
async function cleanLogs() {
    const days = prompt(
        'Удалить логи старше N дней?\n\n' +
        'Минимум 30 дней. Введите число:',
        '90'
    );
    
    if (days === null) return;
    
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 30) {
        showToast('❌ Минимум 30 дней', 'error');
        return;
    }
    
    if (!confirm(`Удалить логи старше ${daysNum} дней?\n\nЭто действие нельзя отменить.`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/logs/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: daysNum })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ ${result.message}`, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка очистки логов', 'error');
    }
}

// Авто-обновление каждые 30 секунд (опционально)
let autoRefreshInterval = null;

function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        showToast('⏸️ Авто-обновление выключено', 'info');
    } else {
        autoRefreshInterval = setInterval(() => {
            location.reload();
        }, 30000);
        showToast('▶️ Авто-обновление включено (30 сек)', 'success');
    }
}

// Сохранение фильтров в URL
document.addEventListener('DOMContentLoaded', function() {
    // Автоматическая отправка формы при изменении select
    const selects = document.querySelectorAll('.filters-form select');
    selects.forEach(select => {
        if (select.name !== 'limit') {
            select.addEventListener('change', function() {
                this.form.submit();
            });
        }
    });
});