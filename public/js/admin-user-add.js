// public/js/admin-user-add.js
// Логика формы добавления пользователя

// ============================================================
// ОТПРАВКА ФОРМЫ
// ============================================================

async function submitForm(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Создание...';

  const formData = {
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    full_name: document.getElementById('full_name').value.trim(),
    department: document.getElementById('department').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    role: document.getElementById('role').value,
  };

  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('tempPasswordValue').textContent = result.tempPassword;
      document.getElementById('passwordUsername').textContent = result.data.username;
      document.getElementById('passwordModal').classList.add('active');
    } else {
      showToast('❌ ' + result.error, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Создать';
    }
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    showToast('❌ Ошибка при создании пользователя', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Создать';
  }
}

function finishCreate() {
  window.location.href = '/admin';
}