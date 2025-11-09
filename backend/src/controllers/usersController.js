const db = require('../config/database');
const logger = require('../config/logger');

class UsersController {
  /**
   * 获取用户列表
   */
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        userType,
        keyword,
        user_id,
        user_name,
        startDate,
        endDate,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      // 筛选条件
      if (userType === 'new') {
        sql += ' AND is_new_user = true';
      } else if (userType === 'old') {
        sql += ' AND is_new_user = false';
      }

      if (user_id) {
        sql += ' AND user_id = ?';
        params.push(user_id);
      } else if (user_name) {
        sql += ' AND username LIKE ?';
        params.push(`%${user_name}%`);
      } else if (keyword) {
        sql += ' AND (user_id LIKE ? OR username LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (startDate) {
        sql += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      // 排序
      const allowedSortFields = ['user_id', 'username', 'total_points', 'available_points', 'created_at'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      sql += ` ORDER BY ${sortField} ${sortDirection}`;

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
      logger.error('获取用户列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(req, res) {
    try {
      const { userId } = req.params;

      // 获取用户基本信息
      const [user] = await db.query(
        'SELECT * FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 获取积分记录
      const records = await db.query(
        `SELECT * FROM point_records 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 100`,
        [userId]
      );

      // 获取兑换记录
      const exchanges = await db.query(
        `SELECT e.*, p.name as product_name 
         FROM exchanges e
         LEFT JOIN products p ON e.product_id = p.id
         WHERE e.user_id = ?
         ORDER BY e.exchange_date DESC
         LIMIT 50`,
        [userId]
      );

      // 获取统计信息
      const [stats] = await db.query(
        `SELECT 
          COUNT(DISTINCT pr.id) as total_records,
          SUM(CASE WHEN pr.points > 0 THEN pr.points ELSE 0 END) as total_earned,
          SUM(CASE WHEN pr.points < 0 THEN ABS(pr.points) ELSE 0 END) as total_used,
          COUNT(DISTINCT CASE WHEN pr.is_expired = true THEN pr.id END) as expired_count
         FROM point_records pr
         WHERE pr.user_id = ?`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          user,
          records,
          exchanges,
          stats: stats || {}
        }
      });
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户详情失败'
      });
    }
  }

  /**
   * 获取用户积分详情（用于手机端查询）
   */
  async getUserPoints(req, res) {
    try {
      const { userId } = req.params;

      const [user] = await db.query(
        'SELECT user_id, username, total_points, available_points, used_points, expired_points, is_new_user FROM users WHERE user_id = ? OR username = ?',
        [userId, userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 获取最近的积分记录
      const records = await db.query(
        `SELECT id, points, source, description, created_at, expire_date, is_expired 
         FROM point_records 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );

      // 获取即将过期的积分
      const expiringPoints = await db.query(
        `SELECT SUM(points) as expiring_points, expire_date
         FROM point_records
         WHERE user_id = ? 
           AND is_expired = false 
           AND expire_date IS NOT NULL
           AND expire_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         GROUP BY expire_date
         ORDER BY expire_date ASC`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          user,
          records,
          expiringPoints
        }
      });
    } catch (error) {
      logger.error('获取用户积分失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户积分失败'
      });
    }
  }

  /**
   * 手动调整用户积分（管理员功能）
   */
  async adjustPoints(req, res) {
    try {
      const { userId } = req.params;
      const { points, description, validity_days } = req.body;

      if (!points || points === 0) {
        return res.status(400).json({
          success: false,
          message: '请输入调整积分数'
        });
      }

      // 检查用户是否存在
      const [user] = await db.query(
        'SELECT available_points FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 如果是扣除积分，检查余额是否足够
      if (points < 0 && user.available_points + points < 0) {
        return res.status(400).json({
          success: false,
          message: '用户积分余额不足'
        });
      }

      await db.transaction(async (connection) => {
        // 计算过期日期
        const moment = require('moment');
        const expireDate = validity_days 
          ? moment().add(validity_days, 'days').format('YYYY-MM-DD')
          : null;

        const balanceAfter = user.available_points + points;

        // 记录积分变动
        await connection.execute(
          `INSERT INTO point_records (user_id, points, balance_after, source, expire_date, description) 
           VALUES (?, ?, ?, 'manual', ?, ?)`,
          [
            userId,
            points,
            balanceAfter,
            expireDate,
            description || `管理员${points > 0 ? '增加' : '扣除'}积分`
          ]
        );

        // 更新用户积分
        if (points > 0) {
          await connection.execute(
            'UPDATE users SET total_points = total_points + ?, available_points = available_points + ? WHERE user_id = ?',
            [points, points, userId]
          );
        } else {
          await connection.execute(
            'UPDATE users SET used_points = used_points + ?, available_points = available_points + ? WHERE user_id = ?',
            [Math.abs(points), points, userId]
          );
        }
      });

      logger.info(`管理员调整用户积分: ${userId}, 积分: ${points}, 操作人: ${req.user.username}`);

      res.json({
        success: true,
        message: '积分调整成功'
      });
    } catch (error) {
      logger.error('调整积分失败:', error);
      res.status(500).json({
        success: false,
        message: '调整积分失败'
      });
    }
  }

  /**
   * 重置用户积分（管理员功能）
   */
  async resetPoints(req, res) {
    try {
      const { userId } = req.params;

      // 检查用户是否存在
      const [user] = await db.query(
        'SELECT user_id FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      await db.transaction(async (connection) => {
        // 删除该用户的所有积分记录
        await connection.execute(
          'DELETE FROM point_records WHERE user_id = ?',
          [userId]
        );

        // 重置用户积分为0
        await connection.execute(
          'UPDATE users SET total_points = 0, available_points = 0, used_points = 0, expired_points = 0 WHERE user_id = ?',
          [userId]
        );
      });

      logger.info(`管理员重置用户积分: ${userId}, 操作人: ${req.user.username}`);

      res.json({
        success: true,
        message: '积分重置成功'
      });
    } catch (error) {
      logger.error('重置积分失败:', error);
      res.status(500).json({
        success: false,
        message: '重置积分失败'
      });
    }
  }

  /**
   * 重置所有用户积分（管理员功能）
   */
  async resetAllPoints(req, res) {
    try {
      await db.transaction(async (connection) => {
        // 删除所有积分记录
        await connection.execute('DELETE FROM point_records');

        // 重置所有用户积分为0
        await connection.execute(
          'UPDATE users SET total_points = 0, available_points = 0, used_points = 0, expired_points = 0'
        );
      });

      logger.info(`管理员重置所有用户积分, 操作人: ${req.user.username}`);

      res.json({
        success: true,
        message: '所有用户积分重置成功'
      });
    } catch (error) {
      logger.error('重置所有用户积分失败:', error);
      res.status(500).json({
        success: false,
        message: '重置所有用户积分失败'
      });
    }
  }

  /**
   * 获取用户统计概况
   */
  async getUserStats(req, res) {
    try {
      // 总用户数
      const [totalUsers] = await db.query(
        'SELECT COUNT(*) as count FROM users'
      );

      // 新用户数
      const [newUsers] = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE is_new_user = true'
      );

      // 活跃用户数（最近30天有积分变动）
      const [activeUsers] = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM point_records 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );

      // 总积分统计
      const [pointsStats] = await db.query(
        `SELECT 
          SUM(total_points) as total_points,
          SUM(available_points) as available_points,
          SUM(used_points) as used_points,
          SUM(expired_points) as expired_points
         FROM users`
      );

      // 近7天新增用户趋势
      const userTrend = await db.query(
        `SELECT 
          DATE(first_import_date) as date,
          COUNT(*) as count
         FROM users
         WHERE first_import_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(first_import_date)
         ORDER BY date ASC`
      );

      res.json({
        success: true,
        data: {
          total: totalUsers.count,
          newUsers: newUsers.count,
          oldUsers: totalUsers.count - newUsers.count,
          activeUsers: activeUsers.count,
          pointsStats: pointsStats || {},
          userTrend
        }
      });
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      });
    }
  }

  /**
   * 导出用户数据
   */
  async exportUsers(req, res) {
    try {
      const { userType, keyword, startDate, endDate } = req.query;

      let sql = 'SELECT user_id, username, phone, total_points, available_points, used_points, expired_points, is_new_user, first_import_date, last_active_date, created_at FROM users WHERE 1=1';
      const params = [];

      if (userType === 'new') {
        sql += ' AND is_new_user = true';
      } else if (userType === 'old') {
        sql += ' AND is_new_user = false';
      }

      if (keyword) {
        sql += ' AND (user_id LIKE ? OR username LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (startDate) {
        sql += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY created_at DESC LIMIT 10000';

      const users = await db.query(sql, params);

      if (!users || users.length === 0) {
        return res.status(200).json({
          success: false,
          message: '暂无可导出的数据'
        });
      }

      // 转换为中文表头格式
      const exportData = users.map(user => ({
        '用户ID': user.user_id,
        '用户名': user.username || '',
        '手机号': user.phone || '',
        '总积分': user.total_points,
        '可用积分': user.available_points,
        '已用积分': user.used_points,
        '过期积分': user.expired_points,
        '用户类型': user.is_new_user ? '新用户' : '老用户',
        '首次导入': user.first_import_date || '',
        '最后活跃': user.last_active_date || '',
        '注册时间': user.created_at
      }));

      // 生成Excel
      const xlsx = require('xlsx');
      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, '用户数据');

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.xlsx`);

      res.send(buffer);
    } catch (error) {
      logger.error('导出用户数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出失败'
      });
    }
  }

  /**
   * 删除用户（管理员功能）
   */
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      const [user] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      await db.transaction(async (connection) => {
        await connection.execute('DELETE FROM point_records WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM exchanges WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM users WHERE user_id = ?', [userId]);
      });

      logger.info(`管理员删除用户: ${userId}, 操作人: ${req.user.username}`);
      res.json({ success: true, message: '用户删除成功' });
    } catch (error) {
      logger.error('删除用户失败:', error);
      res.status(500).json({ success: false, message: '删除用户失败' });
    }
  }

  /**
   * 批量删除用户（管理员功能）
   */
  async batchDeleteUsers(req, res) {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: '请选择要删除的用户' });
      }

      await db.transaction(async (connection) => {
        const placeholders = userIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM point_records WHERE user_id IN (${placeholders})`, userIds);
        await connection.execute(`DELETE FROM exchanges WHERE user_id IN (${placeholders})`, userIds);
        await connection.execute(`DELETE FROM users WHERE user_id IN (${placeholders})`, userIds);
      });

      logger.info(`管理员批量删除用户: ${userIds.join(',')}, 操作人: ${req.user.username}`);
      res.json({ success: true, message: `成功删除 ${userIds.length} 个用户` });
    } catch (error) {
      logger.error('批量删除用户失败:', error);
      res.status(500).json({ success: false, message: '批量删除用户失败' });
    }
  }

  /**
   * 清理所有测试数据（管理员功能）
   */
  async clearAllData(req, res) {
    try {
      await db.transaction(async (connection) => {
        await connection.execute('DELETE FROM point_records');
        await connection.execute('DELETE FROM exchanges');
        await connection.execute('DELETE FROM users');
        await connection.execute('DELETE FROM import_history');
      });

      logger.info(`管理员清理所有数据, 操作人: ${req.user.username}`);
      res.json({ success: true, message: '所有数据已清理' });
    } catch (error) {
      logger.error('清理数据失败:', error);
      res.status(500).json({ success: false, message: '清理数据失败' });
    }
  }
}

module.exports = new UsersController();
