const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../config/logger');

// 获取仪表盘统计数据
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // 用户统计
    const [userStats] = await db.query(
      `SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_new_user = true THEN 1 ELSE 0 END) as new_users,
        SUM(total_points) as total_points,
        SUM(available_points) as available_points
       FROM users`
    );

    // 今日新增用户
    const [todayUsers] = await db.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE DATE(created_at) = CURDATE()`
    );

    // 今日积分变动
    const [todayPoints] = await db.query(
      `SELECT 
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as used
       FROM point_records 
       WHERE DATE(created_at) = CURDATE()`
    );

    // 近7天趋势
    const userTrend = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const pointsTrend = await db.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as used
       FROM point_records
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // 商品和兑换统计
    const [productStats] = await db.query(
      `SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_products,
        SUM(sold_count) as total_sold
       FROM products`
    );

    const [exchangeStats] = await db.query(
      `SELECT 
        COUNT(*) as total_exchanges,
        SUM(points_used) as total_points_used,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
       FROM exchanges`
    );

    // 最近导入
    const recentImports = await db.query(
      `SELECT batch_id, filename, total_rows, new_users, total_points, import_date
       FROM import_history
       ORDER BY import_date DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        userStats: {
          ...userStats,
          todayNew: todayUsers.count
        },
        pointsStats: {
          ...todayPoints,
          total: userStats.total_points,
          available: userStats.available_points
        },
        productStats,
        exchangeStats,
        trends: {
          users: userTrend,
          points: pointsTrend
        },
        recentImports
      }
    });
  } catch (error) {
    logger.error('获取仪表盘数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

module.exports = router;