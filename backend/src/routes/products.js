const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取商品列表（公开，用于手机端）
router.get('/', productsController.getProducts);

// 获取商品分类
router.get('/categories', productsController.getCategories);

// 获取商品统计（管理员）
router.get('/stats', authMiddleware, productsController.getProductStats);

// 获取商品详情
router.get('/:id', productsController.getProductById);

// 创建商品（管理员）
router.post('/', authMiddleware, requireAdmin, productsController.createProduct);

// 更新商品（管理员）
router.put('/:id', authMiddleware, requireAdmin, productsController.updateProduct);

// 删除商品（管理员）
router.delete('/:id', authMiddleware, requireAdmin, productsController.deleteProduct);

// 批量上下架（管理员）
router.post('/batch/toggle', authMiddleware, requireAdmin, productsController.batchToggleProducts);

module.exports = router;