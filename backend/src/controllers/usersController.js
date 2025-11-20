const db = require('../config/database');
const logger = require('../config/logger');
const { generateToken } = require('../middleware/auth');
const { hashPassword, comparePassword, DEFAULT_USER_PASSWORD } = require('../utils/password');

const ADMIN_ROLES = ['admin', 'super_admin'];
const isAdminUser = (user) => user && ADMIN_ROLES.includes(user.role);
const SAFE_USER_FIELDS = `
  user_id,
  username,
  phone,
  avatar,
  total_points,
  available_points,
  used_points,
  expired_points,
  is_new_user,
  first_import_date,
  last_active_date,
  created_at,
  updated_at,
  password_updated_at
`.replace(/\s+/g, ' ').trim();
const USER_TOKEN_EXPIRES_IN = process.env.USER_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '7d';

const formatUserProfile = (user = {}) => ({
  user_id: user.user_id,
  username: user.username,
  phone: user.phone,
  avatar: user.avatar,
  total_points: user.total_points,
  available_points: user.available_points,
  used_points: user.used_points,
  expired_points: user.expired_points,
  is_new_user: !!user.is_new_user,
  first_import_date: user.first_import_date,
  last_active_date: user.last_active_date,
  password_updated_at: user.password_updated_at,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

class UsersController {
  /**
   * 用户登录（移动端）
   */
  async loginUser(req, res) {
    try {
      const { identifier, password } = req.body || {};

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: '请输入用户ID/用户名和密码',
        });
      }

      const keyword = identifier.trim();
      const [user] = await db.query(
        `SELECT ${SAFE_USER_FIELDS}, password_hash FROM users WHERE user_id = ? OR username = ? LIMIT 1`,
        [keyword, keyword]
      );

      if (!user || !user.password_hash) {
        return res.status(401).json({
          success: false,
          message: '用户不存在或密码错误',
        });
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户不存在或密码错误',
        });
      }

      const tokenPayload = {
        user_id: user.user_id,
        username: user.username,
        role: 'member',
      };
      const token = generateToken(tokenPayload, USER_TOKEN_EXPIRES_IN);

      res.json({
        success: true,
        data: {
          token,
          user: formatUserProfile(user),
        },
      });
    } catch (error) {
      logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        message: '登录失败',
      });
    }
  }

  /**
   * 获取当前登录用户的基本信息
   */
  async getSelfProfile(req, res) {
    try {
      if (!req.user?.user_id) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求，无法获取用户信息',
        });
      }

      const [user] = await db.query(
        `SELECT ${SAFE_USER_FIELDS} FROM users WHERE user_id = ?`,
        [req.user.user_id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      res.json({
        success: true,
        data: formatUserProfile(user),
      });
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
      });
    }
  }

  /**
   * 当前登录用户修改自己的密码
   */
  async changeOwnPassword(req, res) {
    try {
      if (!req.user?.user_id) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求，无法修改密码',
        });
      }

      const { oldPassword, newPassword } = req.body || {};
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '请输入原密码和新密码',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: '新密码长度不能少于6位',
        });
      }

      const [user] = await db.query(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [req.user.user_id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      const match = await comparePassword(oldPassword, user.password_hash || '');
      if (!match) {
        return res.status(400).json({
          success: false,
          message: '原密码错误',
        });
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.query(
        'UPDATE users SET password_hash = ?, password_updated_at = NOW() WHERE user_id = ?',
        [hashedPassword, req.user.user_id]
      );

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error) {
      logger.error('修改用户密码失败:', error);
      res.status(500).json({
        success: false,
        message: '修改密码失败',
      });
    }
  }

  /**
   * 管理员重置指定用户密码为初始值
   */
  async resetUserPassword(req, res) {
    try {
      const { userId } = req.params;

      const [user] = await db.query(
        'SELECT user_id FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      const hashedPassword = await hashPassword(DEFAULT_USER_PASSWORD);
      await db.query(
        'UPDATE users SET password_hash = ?, password_updated_at = NULL WHERE user_id = ?',
        [hashedPassword, userId]
      );

      logger.info(`管理员 ${req.user?.username || 'system'} 已将用户 ${userId} 密码重置为默认值`);

      res.json({
        success: true,
        message: `用户密码已重置为 ${DEFAULT_USER_PASSWORD}`,
      });
    } catch (error) {
      logger.error('重置用户密码失败:', error);
      res.status(500).json({
        success: false,
        message: '重置用户密码失败',
      });
    }
  }

  /**
   * 当前登录用户积分概要
   */
  async getSelfPointsSummary(req, res) {
    try {
      if (!req.user?.user_id) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求，无法访问该资源',
        });
      }

      const userId = req.user.user_id;
      const { page = 1, pageSize = 20 } = req.query;
      
      const [user] = await db.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE user_id = ?`, [userId]);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      
      const pageInt = parseInt(page) || 1;
      const pageSizeInt = parseInt(pageSize) || 20;
      const offset = (pageInt - 1) * pageSizeInt;
      
      const records = await db.query(
        `SELECT id, user_id, points, balance_after, source, description,
                expire_date, is_expired, created_at, import_batch
         FROM point_records
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${pageSizeInt} OFFSET ${offset}`,
        [userId]
      );
      
      res.json({
        success: true,
        data: {
          user: formatUserProfile(user),
          records
        }
      });
    } catch (error) {
      logger.error('获取用户积分概要失败:', error);
      res.status(500).json({ success: false, message: '获取用户积分概要失败' });
    }
  }

  async getUsers(req, res) {
    try {
      const { page = 1, pageSize = 10, keyword, userType, startDate, endDate } = req.query;
      
      let whereConditions = [];
      let params = [];
      
      if (keyword) {
        whereConditions.push('(user_id LIKE ? OR username LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      
      if (userType === 'new') {
        whereConditions.push('is_new_user = 1');
      } else if (userType === 'old') {
        whereConditions.push('is_new_user = 0');
      }
      
      if (startDate) {
        whereConditions.push('DATE(created_at) >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push('DATE(created_at) <= ?');
        params.push(endDate);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const [{ total }] = await db.query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );
      
      const pageInt = parseInt(page) || 1;
      const pageSizeInt = parseInt(pageSize) || 10;
      const offset = (pageInt - 1) * pageSizeInt;
      
      const users = await db.query(
        `SELECT ${SAFE_USER_FIELDS} FROM users ${whereClause} ORDER BY created_at DESC LIMIT ${pageSizeInt} OFFSET ${offset}`,
        params
      );
      
      res.json({
        success: true,
        data: {
          list: users,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
  }

  async getUserStats(req, res) {
    try {
      const [stats] = await db.query('SELECT COUNT(*) as total FROM users');
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      res.status(500).json({ success: false, message: '获取用户统计失败' });
    }
  }

  async exportUsers(req, res) {
    try {
      const users = await db.query(`SELECT ${SAFE_USER_FIELDS} FROM users`);
      res.json({ success: true, data: users });
    } catch (error) {
      logger.error('导出用户失败:', error);
      res.status(500).json({ success: false, message: '导出用户失败' });
    }
  }

  async resetAllPoints(req, res) {
    try {
      await db.query('UPDATE users SET available_points = 0, used_points = 0, expired_points = 0');
      res.json({ success: true, message: '所有用户积分已重置' });
    } catch (error) {
      logger.error('重置所有用户积分失败:', error);
      res.status(500).json({ success: false, message: '重置失败' });
    }
  }

  async clearAllData(req, res) {
    try {
      await db.query('DELETE FROM users WHERE role != "admin"');
      res.json({ success: true, message: '数据已清理' });
    } catch (error) {
      logger.error('清理数据失败:', error);
      res.status(500).json({ success: false, message: '清理失败' });
    }
  }

  async getUserDetail(req, res) {
    try {
      const { userId } = req.params;
      const [user] = await db.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE user_id = ?`, [userId]);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      res.status(500).json({ success: false, message: '获取用户详情失败' });
    }
  }

  async getUserPoints(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;
      
      const [user] = await db.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE user_id = ?`, [userId]);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      
      const pageInt = parseInt(page) || 1;
      const pageSizeInt = parseInt(pageSize) || 20;
      const offset = (pageInt - 1) * pageSizeInt;
      
      const [{ total }] = await db.query(
        'SELECT COUNT(*) as total FROM point_records WHERE user_id = ?',
        [userId]
      );
      
      const records = await db.query(
        `SELECT id, user_id, points, balance_after, source, description,
                expire_date, is_expired, created_at, import_batch
         FROM point_records
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${pageSizeInt} OFFSET ${offset}`,
        [userId]
      );
      
      res.json({
        success: true,
        data: {
          user: formatUserProfile(user),
          records,
          total
        }
      });
    } catch (error) {
      logger.error('获取用户积分失败:', error);
      res.status(500).json({ success: false, message: '获取用户积分失败' });
    }
  }

  async adjustPoints(req, res) {
    try {
      const { userId } = req.params;
      const { points } = req.body;
      await db.query('UPDATE users SET available_points = available_points + ? WHERE user_id = ?', [points, userId]);
      res.json({ success: true, message: '积分调整成功' });
    } catch (error) {
      logger.error('调整积分失败:', error);
      res.status(500).json({ success: false, message: '调整积分失败' });
    }
  }

  async resetPoints(req, res) {
    try {
      const { userId } = req.params;
      await db.query('UPDATE users SET available_points = 0, used_points = 0, expired_points = 0 WHERE user_id = ?', [userId]);
      res.json({ success: true, message: '用户积分已重置' });
    } catch (error) {
      logger.error('重置用户积分失败:', error);
      res.status(500).json({ success: false, message: '重置失败' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
      res.json({ success: true, message: '用户已删除' });
    } catch (error) {
      logger.error('删除用户失败:', error);
      res.status(500).json({ success: false, message: '删除用户失败' });
    }
  }

  async batchDeleteUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: '请提供用户ID列表' });
      }
      await db.query('DELETE FROM users WHERE user_id IN (?)', [userIds]);
      res.json({ success: true, message: '批量删除成功' });
    } catch (error) {
      logger.error('批量删除用户失败:', error);
      res.status(500).json({ success: false, message: '批量删除失败' });
    }
  }
}

module.exports = new UsersController();
