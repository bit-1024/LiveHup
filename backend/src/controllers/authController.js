const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../config/logger');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

class AuthController {
  /**
   * 管理员登录
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '请输入用户名和密码'
        });
      }

      // 查询管理员
      const [admin] = await db.query(
        'SELECT * FROM admins WHERE username = ? AND is_active = true',
        [username]
      );

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 更新最后登录信息
      await db.query(
        'UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
        [req.ip, admin.id]
      );

      // 生成token
      const tokenPayload = {
        id: admin.id,
        username: admin.username,
        role: admin.role
      };

      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      logger.info(`管理员登录成功: ${username}`);

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          refreshToken,
          user: {
            id: admin.id,
            username: admin.username,
            real_name: admin.real_name,
            email: admin.email,
            role: admin.role
          }
        }
      });
    } catch (error) {
      logger.error('登录失败:', error);
      res.status(500).json({
        success: false,
        message: '登录失败: ' + error.message
      });
    }
  }

  /**
   * 管理员注册（仅超级管理员可用）
   */
  async register(req, res) {
    try {
      const { username, password, real_name, email, phone, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      // 检查用户名是否已存在
      const [existingAdmin] = await db.query(
        'SELECT id FROM admins WHERE username = ?',
        [username]
      );

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建管理员
      const result = await db.query(
        `INSERT INTO admins (username, password, real_name, email, phone, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          username,
          hashedPassword,
          real_name || null,
          email || null,
          phone || null,
          role || 'operator'
        ]
      );

      logger.info(`新管理员注册成功: ${username} (ID: ${result.insertId})`);

      res.json({
        success: true,
        message: '注册成功',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('注册失败:', error);
      res.status(500).json({
        success: false,
        message: '注册失败: ' + error.message
      });
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '请提供刷新令牌'
        });
      }

      // 验证refreshToken（在实际应用中应该验证token）
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      // 生成新token
      const tokenPayload = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };

      const newToken = generateToken(tokenPayload);

      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (error) {
      logger.error('刷新token失败:', error);
      res.status(401).json({
        success: false,
        message: '刷新令牌无效或已过期'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req, res) {
    try {
      const [admin] = await db.query(
        'SELECT id, username, real_name, email, phone, role, last_login_at FROM admins WHERE id = ?',
        [req.user.id]
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '请输入旧密码和新密码'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: '新密码长度不能少于6位'
        });
      }

      // 查询当前用户
      const [admin] = await db.query(
        'SELECT password FROM admins WHERE id = ?',
        [req.user.id]
      );

      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
      
      if (!isOldPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '旧密码错误'
        });
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await db.query(
        'UPDATE admins SET password = ? WHERE id = ?',
        [hashedNewPassword, req.user.id]
      );

      logger.info(`管理员修改密码: ${req.user.username}`);

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      logger.error('修改密码失败:', error);
      res.status(500).json({
        success: false,
        message: '修改密码失败'
      });
    }
  }

  /**
   * 登出
   */
  async logout(req, res) {
    try {
      // 在实际应用中，可以将token加入黑名单
      logger.info(`管理员登出: ${req.user.username}`);
      
      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      logger.error('登出失败:', error);
      res.status(500).json({
        success: false,
        message: '登出失败'
      });
    }
  }
}

module.exports = new AuthController();