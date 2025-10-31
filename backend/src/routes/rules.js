const express = require('express');
const router = express.Router();
const rulesController = require('../controllers/rulesController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取所有规则
router.get('/', authMiddleware, rulesController.getRules);

// 获取规则统计
router.get('/stats', authMiddleware, rulesController.getRuleStats);

// 获取单个规则详情
router.get('/:id', authMiddleware, rulesController.getRuleById);

// 创建规则
router.post('/', authMiddleware, requireAdmin, rulesController.createRule);

// 更新规则
router.put('/:id', authMiddleware, requireAdmin, rulesController.updateRule);

// 删除规则
router.delete('/:id', authMiddleware, requireAdmin, rulesController.deleteRule);

// 复制规则
router.post('/:id/copy', authMiddleware, requireAdmin, rulesController.copyRule);

// 批量启用/禁用规则
router.post('/batch/toggle', authMiddleware, requireAdmin, rulesController.batchToggleRules);

module.exports = router;