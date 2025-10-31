const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Placeholder controller
const pointsController = {
  getPointsHistory: (req, res) => res.json({ success: true, data: [], message: 'To be implemented' }),
  getExpiringPoints: (req, res) => res.json({ success: true, data: [], message: 'To be implemented' })
};

// 获取积分历史
router.get('/history/:userId', pointsController.getPointsHistory);

// 获取即将过期的积分
router.get('/expiring/:userId', pointsController.getExpiringPoints);

module.exports = router;