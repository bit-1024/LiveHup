const express = require('express');
const router = express.Router();
const exchangesController = require('../controllers/exchangesController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取兑换列表（支持移动端用户查询和管理员查询）
router.get('/', authMiddleware, exchangesController.getExchanges);

// 导出兑换数据（管理员）
router.get('/export', authMiddleware, requireAdmin, exchangesController.exportExchanges);

// 获取兑换统计（管理员）
router.get('/stats/summary', authMiddleware, requireAdmin, exchangesController.getExchangeStats);

// 获取兑换详情（移动端和管理员）
router.get('/:id', authMiddleware, exchangesController.getExchangeDetail);

// 创建兑换申请（移动端用户）
router.post('/', authMiddleware, exchangesController.createExchange);

// 批量更新兑换状态（管理员）
router.put('/batch/status', authMiddleware, requireAdmin, exchangesController.batchUpdateStatus);

// 更新兑换状态（管理员）
router.put('/:id/status', authMiddleware, requireAdmin, exchangesController.updateExchange);

// 取消兑换（用户/管理员）
router.post('/:id/cancel', authMiddleware, exchangesController.cancelExchange);

module.exports = router;
