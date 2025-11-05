const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');

class PointsController {
  /**
   * 获取积分记录
   */
  async getPointsRecords(req, res) {
    try {
      const {
        user_id,
        page = 1,
        pageSize = 20,
        source,
        start_date,
        end_date,
        is_expired
      } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空'
        });
      }

      let sql = `
        SELECT id, user_id, points, balance_after, source, description, 
               expire_date, is_expired, created_at
        FROM point_records
        WHERE user_id = ?
      `;
      const params = [user_id];

      // 筛选条件
      if (source) {
        sql += ' AND source = ?';
        params.push(source);
      }

      if (is_expired !== undefined) {
        sql += ' AND is_expired = ?';
        params.push(is_expired === 'true' || is_expired === '1');
      }

      if (start_date) {
        sql += ' AND created_at >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND created_at <= ?';
        params.push(moment(end_date).add(1, 'day').format('YYYY-MM-DD'));
      }

      sql += ' ORDER BY created_at DESC';

      const result = await db.paginate(sql, params, parseInt(page), parseInt(pageSize));

      res.json({
        success: true,
        data: {
          list: result.data,
          total: result.pagination.total
        },
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取积分记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分记录失败'
      });
    }
  }

  /**
   * 获取积分历史（兼容旧路由）
   */
  async getPointsHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;

      const sql = `
        SELECT id, user_id, points, balance_after, source, description, 
               expire_date, is_expired, created_at
        FROM point_records
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;

      const result = await db.paginate(sql, [userId], parseInt(page), parseInt(pageSize));

      res.json({
        success: true,
        data: {
          list: result.data,
          total: result.pagination.total
        },
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取积分历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分历史失败'
      });
    }
  }

  /**
   * 获取即将过期的积分
   */
  async getExpiringPoints(req, res) {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      const expiringPoints = await db.query(
        `SELECT 
           SUM(points) as expiring_points, 
           expire_date,
           DATEDIFF(expire_date, CURDATE()) as days_to_expire
         FROM point_records
         WHERE user_id = ? 
           AND is_expired = false 
           AND expire_date IS NOT NULL
           AND expire_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         GROUP BY expire_date
         ORDER BY expire_date ASC`,
        [userId, parseInt(days)]
      );

      // 计算总即将过期积分
      const totalExpiring = expiringPoints.reduce((sum, item) => sum + (item.expiring_points || 0), 0);

      res.json({
        success: true,
        data: {
          total_expiring: totalExpiring,
          expiring_list: expiringPoints
        }
      });
    } catch (error) {
      logger.error('获取即将过期积分失败:', error);
      res.status(500).json({
        success: false,
        message: '获取即将过期积分失败'
      });
    }
  }

  /**
   * 获取积分统计
   */
  async getPointsStats(req, res) {
    try {
      const { userId } = req.params;

      // 获取用户积分汇总
      const [userPoints] = await db.query(
        `SELECT total_points, available_points, used_points, expired_points
         FROM users
         WHERE user_id = ?`,
        [userId]
      );

      if (!userPoints) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 获取各来源积分统计
      const sourceStats = await db.query(
        `SELECT 
           source,
           COUNT(*) as count,
           SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
           SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as used
         FROM point_records
         WHERE user_id = ?
         GROUP BY source`,
        [userId]
      );

      // 获取近30天积分变动趋势
      const trend = await db.query(
        `SELECT 
           DATE(created_at) as date,
           SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
           SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as used
         FROM point_records
         WHERE user_id = ? 
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [userId]
      );

      // 获取即将过期的积分
      const [expiringSum] = await db.query(
        `SELECT SUM(points) as total
         FROM point_records
         WHERE user_id = ? 
           AND is_expired = false 
           AND expire_date IS NOT NULL
           AND expire_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          summary: userPoints,
          sourceStats,
          trend,
          expiring_soon: expiringSum.total || 0
        }
      });
    } catch (error) {
      logger.error('获取积分统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分统计失败'
      });
    }
  }

  /**
   * 获取积分排行榜
   */
  async getPointsRanking(req, res) {
    try {
      const {
        type = 'total', // total: 总积分, available: 可用积分
        limit = 100
      } = req.query;

      const orderField = type === 'available' ? 'available_points' : 'total_points';

      const ranking = await db.query(
        `SELECT 
           user_id,
           username,
           total_points,
           available_points,
           is_new_user
         FROM users
         WHERE ${orderField} > 0
         ORDER BY ${orderField} DESC
         LIMIT ?`,
        [parseInt(limit)]
      );

      // 添加排名
      const rankedList = ranking.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      res.json({
        success: true,
        data: {
          type,
          list: rankedList
        }
      });
    } catch (error) {
      logger.error('获取积分排行榜失败:', error);
      res.status(500).json({
        success: false,
        message: '获取排行榜失败'
      });
    }
  }

  /**
   * 获取积分明细导出数据
   */
  async exportPointsRecords(req, res) {
    try {
      const { user_id, start_date, end_date } = req.query;

      let sql = `
        SELECT 
          user_id,
          points,
          balance_after,
          source,
          description,
          expire_date,
          is_expired,
          created_at
        FROM point_records
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        sql += ' AND user_id = ?';
        params.push(user_id);
      }

      if (start_date) {
        sql += ' AND created_at >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND created_at <= ?';
        params.push(moment(end_date).add(1, 'day').format('YYYY-MM-DD'));
      }

      sql += ' ORDER BY created_at DESC LIMIT 10000';

      const records = await db.query(sql, params);

      // 生成Excel
      const xlsx = require('xlsx');
      const ws = xlsx.utils.json_to_sheet(records);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, '积分记录');

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=points_records_${Date.now()}.xlsx`);

      res.send(buffer);
    } catch (error) {
      logger.error('导出积分记录失败:', error);
      res.status(500).json({
        success: false,
        message: '导出失败'
      });
    }
  }
}

module.exports = new PointsController();