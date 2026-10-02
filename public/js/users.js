// public/js/users.js
// Логика страницы "Пользователи"

document.addEventListener('DOMContentLoaded', function () {
    setupSearch();
});

// ============================================================
// ПОИСК ПО ТАБЛИЦЕ
// ============================================================

function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        filterTable(query);
    });

    // Автофокус
    input.focus();
}

function filterTable(query) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        // Пропускаем строку с пустым состоянием
        if (row.querySelector('.empty-state')) {
            row.style.display = query ? 'none' : '';
            return;
        }

        const haystack = (row.dataset.search || '').toLowerCase();
        const match = !query || haystack.includes(query);
        row.style.display = match ? '' : 'none';
    });
}