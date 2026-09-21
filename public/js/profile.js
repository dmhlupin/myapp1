// public/js/profile.js — Логика личного кабинета

// Показать админские ссылки, если пользователь — админ
document.addEventListener('DOMContentLoaded', function() {
    const headerActions = document.getElementById('headerActions');
    const adminLinks = document.getElementById('adminLinks');
    
    if (!headerActions || !adminLinks) return;
    
    // Читаем роль из data-атрибута
    const isAdmin = headerActions.getAttribute('data-is-admin') === 'true';
    
    if (isAdmin) {
        adminLinks.innerHTML = `
            <a href="/" class="btn btn-back btn-sm" title="Дашборд">📊 Дашборд</a>
            <a href="/admin" class="btn btn-back btn-sm" title="Админ-панель">⚙️ Админ-панель</a>
        `;
    }
});

function toggleEditProfile() {
    const viewEl = document.getElementById('profileView');
    const formEl = document.getElementById('profileEditForm');
    const editBtn = document.getElementById('editBtn');
    
    viewEl.style.display = 'none';
    formEl.style.display = 'block';
    editBtn.style.display = 'none';
}

function cancelEditProfile() {
    const viewEl = document.getElementById('profileView');
    const formEl = document.getElementById('profileEditForm');
    const editBtn = document.getElementById('editBtn');
    
    viewEl.style.display = 'block';
    formEl.style.display = 'none';
    editBtn.style.display = 'inline-flex';
}

async function saveProfile(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Сохранение...';
    
    const formData = {
        email: document.getElementById('editEmail').value.trim(),
        full_name: document.getElementById('editFullName').value.trim(),
        department: document.getElementById('editDepartment').value.trim(),
        phone: document.getElementById('editPhone').value.trim()
    };
    
    try {
        const response = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Профиль обновлён!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('❌ ' + result.error, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Сохранить';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка соединения', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Сохранить';
    }
}