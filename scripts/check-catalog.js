// scripts/check-catalog.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Проверка справочника категорий и типов...\n');

// Категории
db.all(`
  SELECT 
    c.id, c.name, c.icon,
    (SELECT COUNT(*) FROM equipment_types WHERE category_id = c.id) as types_count,
    (SELECT COUNT(*) FROM equipment WHERE category_id = c.id) as equipment_count
  FROM equipment_categories c
  ORDER BY c.sort_order
`, (err, categories) => {
  if (err) {
    console.error('❌ Ошибка:', err);
    return;
  }
  
  console.log('📁 Категории:');
  console.log('─'.repeat(70));
  console.log(`${'ID'.padEnd(4)} ${'Иконка'.padEnd(8)} ${'Название'.padEnd(30)} ${'Типов'.padEnd(8)} ${'Техники'}`);
  console.log('─'.repeat(70));
  
  categories.forEach(c => {
    console.log(`${String(c.id).padEnd(4)} ${(c.icon || '—').padEnd(8)} ${c.name.padEnd(30)} ${String(c.types_count).padEnd(8)} ${c.equipment_count}`);
  });
  
  console.log('');
  
  // Типы
  db.all(`
    SELECT 
      t.id, t.name, t.icon,
      c.name as category_name,
      (SELECT COUNT(*) FROM equipment WHERE type_id = t.id) as equipment_count
    FROM equipment_types t
    JOIN equipment_categories c ON t.category_id = c.id
    ORDER BY c.sort_order, t.sort_order
  `, (err, types) => {
    if (err) {
      console.error('❌ Ошибка:', err);
      return;
    }
    
    console.log('📦 Типы:');
    console.log('─'.repeat(70));
    console.log(`${'ID'.padEnd(4)} ${'Иконка'.padEnd(8)} ${'Название'.padEnd(25)} ${'Категория'.padEnd(25)} ${'Техники'}`);
    console.log('─'.repeat(70));
    
    types.forEach(t => {
      console.log(`${String(t.id).padEnd(4)} ${(t.icon || '—').padEnd(8)} ${t.name.padEnd(25)} ${t.category_name.padEnd(25)} ${t.equipment_count}`);
    });
    
    // Техника без типа
    db.all(`
      SELECT id, inventory_number, name 
      FROM equipment 
      WHERE type_id IS NULL
    `, (err, untyped) => {
      if (err) {
        console.error('❌ Ошибка:', err);
        return;
      }
      
      if (untyped.length > 0) {
        console.log('');
        console.log('⚠️  Техника без типа:');
        console.log('─'.repeat(70));
        untyped.forEach(eq => {
          console.log(`   ID ${eq.id}: ${eq.inventory_number} — ${eq.name}`);
        });
      } else {
        console.log('');
        console.log('✅ Вся техника имеет тип');
      }
      
      db.close();
    });
  });
});