const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Placeholder controller - will be implemented
const exchangesController = {
  getExchanges: (req, res) => res.json({ success: true, data: [], message: 'To be implemented' }),
  createExchange: (req, res) => res.json({ success: true, message: 'To be implemented' }),
  updateExchange: (req, res) => res.json({ success: true, message: 'To be implemented' }),
  cancelExchange: (req, res) => res.json({ success: true, message: 'To be implemented' })
};

// 获取兑换列表
router.get('/', authMiddleware, exchangesController.getExchanges);

// 创建兑换订单（用户端）
router.post('/', exchangesController.createExchange);

// 更新兑换状态（管理员）
router.put('/:id', authMiddleware, requireAdmin, exchangesController.updateExchange);

// 取消兑换（用户/管理员）
router.post('/:id/cancel', authMiddleware, exchangesController.cancelExchange);

module.exports = router;