// JavaScript для страницы редактирования

const equipmentId = parseInt(document.getElementById('equipmentId').value);

async function submitForm(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Обновление...';

    const formData = {
        inventory_number: document.getElementById('inventory_number').value.trim(),
        name: document.getElementById('name').value.trim(),
        model: document.getElementById('model').value.trim(),
        serial_number: document.getElementById('serial_number').value.trim(),
        manufacturer: document.getElementById('manufacturer').value.trim(),
        purchase_date: document.getElementById('purchase_date').value || null,
        warranty_until: document.getElementById('warranty_until').value || null,
        status: document.getElementById('status').value,
        description: document.getElementById('description').value.trim()
    };

    try {
        const response = await fetch(`/api/admin/equipment/${equipmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showToast('✅ Техника успешно обновлена!', 'success');
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1500);
        } else {
            showToast('❌ ' + result.error, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Обновить';
        }
    } catch (error) {
        showToast('❌ Ошибка при обновлении техники', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Обновить';
    }
}