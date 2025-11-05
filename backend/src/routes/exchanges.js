const express = require('express');
const router = express.Router();
const exchangesController = require('../controllers/exchangesController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取兑换列表（支持移动端用户查询和管理端查询）
router.get('/', exchangesController.getExchanges);

// 获取兑换详情（移动端和管理端）
router.get('/:id', exchangesController.getExchangeDetail);

// 创建兑换订单（移动端用户）
router.post('/', exchangesController.createExchange);

// 更新兑换状态（管理员）
router.put('/:id', authMiddleware, requireAdmin, exchangesController.updateExchange);

// 取消兑换（用户/管理员）
router.post('/:id/cancel', exchangesController.cancelExchange);

// 获取兑换统计（管理员）
router.get('/stats/summary', authMiddleware, exchangesController.getExchangeStats);

module.exports = router;