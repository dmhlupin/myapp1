const fs = require('fs');
const html = fs.readFileSync('./views/admin-catalog.html', 'utf8');

// Проверяем парность тегов
const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log('📊 <div>: открыто', opens, ', закрыто', closes);
console.log('   ' + (opens === closes ? '✅ Парность OK' : '❌ Несовпадение!'));

// Проверяем скрипты
const scripts = ['main.js', 'help.js', 'footer.js', 'catalog.js'];
console.log('');
console.log('📋 Подключение скриптов:');
scripts.forEach(s => {
  const found = html.includes(s);
  console.log('   ' + (found ? '✅' : '❌') + ' ' + s);
});

// Проверяем модальные окна
const modals = ['categoryModal', 'typeModal', 'deleteModal'];
console.log('');
console.log('📋 Модальные окна:');
modals.forEach(m => {
  const found = html.includes('id=\"' + m + '\"');
  console.log('   ' + (found ? '✅' : '❌') + ' ' + m);
});