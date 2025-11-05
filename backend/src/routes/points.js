const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取积分记录（移动端使用，支持查询参数user_id）
router.get('/records', pointsController.getPointsRecords);

// 获取积分历史（兼容旧路由）
router.get('/history/:userId', pointsController.getPointsHistory);

// 获取即将过期的积分
router.get('/expiring/:userId', pointsController.getExpiringPoints);

// 获取积分统计
router.get('/stats/:userId', pointsController.getPointsStats);

// 获取积分排行榜
router.get('/ranking', pointsController.getPointsRanking);

// 导出积分记录（管理员）
router.get('/export', authMiddleware, requireAdmin, pointsController.exportPointsRecords);

module.exports = router;