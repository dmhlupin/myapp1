// routes/warehouses.js
// Управление складами: CRUD + иерархия

const fs = require('fs');
const path = require('path');
const {
  // Склады
  getAllWarehouses,
  getWarehouseById,
  getDefaultWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  setDefaultWarehouse,
  // Статистика
  getWarehouseStats,
  getWarehouseTree,
} = require('../database/db');
const { logAction } = require('../utils/logger');

// ============================================================
// СТРАНИЦА
// ============================================================

/**
 * GET /admin/warehouses — страница управления складами
 */
async function renderWarehouses(req, res) {
  try {
    const warehouses = await getAllWarehouses();
    const stats = await getWarehouseStats();
    
    const htmlPath = path.join(__dirname, '..', 'views', 'admin-warehouses.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Статистика
    html = html.replace(/\{\{total_warehouses\}\}/g, stats.total_warehouses || 0);
    html = html.replace(/\{\{total_zones\}\}/g, stats.total_zones || 0);
    html = html.replace(/\{\{total_racks\}\}/g, stats.total_racks || 0);
    html = html.replace(/\{\{total_cells\}\}/g, stats.total_cells || 0);
    html = html.replace(/\{\{equipment_on_stock\}\}/g, stats.equipment_on_stock || 0);
    
    res.send(html);
  } catch (error) {
    console.error('❌ Ошибка загрузки складов:', error);
    res.status(500).send('Ошибка загрузки страницы');
  }
}

// ============================================================
// API — СКЛАДЫ
// ============================================================

/**
 * GET /api/admin/warehouses — список складов
 */
async function getWarehousesAPI(req, res) {
  try {
    const warehouses = await getAllWarehouses();
    res.json(warehouses);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/warehouses/:id — один склад
 */
async function getWarehouseAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID' });
    }
    
    const warehouse = await getWarehouseById(id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Склад не найден' });
    }
    
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/admin/warehouses — создать склад
 */
async function createWarehouseAPI(req, res) {
  try {
    const { name, address, description, is_default } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название склада обязательно' });
    }
    
    const result = await createWarehouse({
      name: name.trim(),
      address: (address || '').trim(),
      description: (description || '').trim(),
      is_default: is_default === true || is_default === 'true',
    });
    
    await logAction({
      req,
      action: 'warehouse_create',
      entityType: 'warehouse',
      entityId: result.id,
      details: JSON.stringify({ name: name.trim() }),
    });
    
    res.json({
      success: true,
      message: 'Склад создан',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Склад с таким названием уже существует' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /api/admin/warehouses/:id — обновить склад
 */
async function updateWarehouseAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID' });
    }
    
    const { name, address, description, is_default, is_active } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название склада обязательно' });
    }
    
    const result = await updateWarehouse(id, {
      name: name.trim(),
      address: (address || '').trim(),
      description: (description || '').trim(),
      is_default: is_default === true || is_default === 'true',
      is_active: is_active !== false && is_active !== 'false',
    });
    
    await logAction({
      req,
      action: 'warehouse_update',
      entityType: 'warehouse',
      entityId: id,
      details: JSON.stringify({ name: name.trim() }),
    });
    
    res.json({
      success: true,
      message: 'Склад обновлён',
      data: result,
    });
  } catch (error) {
    if (error.message === 'Склад не найден') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Склад с таким названием уже существует' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /api/admin/warehouses/:id — удалить склад
 */
async function deleteWarehouseAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID' });
    }
    
    const warehouse = await getWarehouseById(id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Склад не найден' });
    }
    
    const result = await deleteWarehouse(id);
    
    await logAction({
      req,
      action: 'warehouse_delete',
      entityType: 'warehouse',
      entityId: id,
      details: JSON.stringify({ name: warehouse.name }),
    });
    
    res.json({
      success: true,
      message: 'Склад удалён',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Нельзя удалить')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * POST /api/admin/warehouses/:id/set-default — сделать складом по умолчанию
 */
async function setDefaultWarehouseAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID' });
    }
    
    const warehouse = await getWarehouseById(id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Склад не найден' });
    }
    
    await setDefaultWarehouse(id);
    
    await logAction({
      req,
      action: 'warehouse_set_default',
      entityType: 'warehouse',
      entityId: id,
      details: JSON.stringify({ name: warehouse.name }),
    });
    
    res.json({
      success: true,
      message: `Склад "${warehouse.name}" назначен по умолчанию`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/warehouses/:id/tree — дерево склада
 */
async function getWarehouseTreeAPI(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Неверный ID' });
    }
    
    const tree = await getWarehouseTree(id);
    if (!tree || tree.length === 0) {
      return res.status(404).json({ error: 'Склад не найден' });
    }
    
    res.json(tree[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/warehouses/tree — дерево всех складов
 */
async function getFullTreeAPI(req, res) {
  try {
    const tree = await getWarehouseTree();
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/admin/warehouses/stats — статистика
 */
async function getWarehouseStatsAPI(req, res) {
  try {
    const stats = await getWarehouseStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================================
// ЭКСПОРТ
// ============================================================

module.exports = {
  // Страница
  renderWarehouses,
  
  // API складов
  getWarehousesAPI,
  getWarehouseAPI,
  createWarehouseAPI,
  updateWarehouseAPI,
  deleteWarehouseAPI,
  setDefaultWarehouseAPI,
  
  // Дерево и статистика
  getWarehouseTreeAPI,
  getFullTreeAPI,
  getWarehouseStatsAPI,
};