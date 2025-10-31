const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

// 登录
router.post('/login', authController.login);

// 注册（仅超级管理员）
router.post('/register', authMiddleware, requireSuperAdmin, authController.register);

// 刷新token
router.post('/refresh', authController.refreshToken);

// 获取当前用户信息
router.get('/me', authMiddleware, authController.getCurrentUser);

// 修改密码
router.post('/change-password', authMiddleware, authController.changePassword);

// 登出
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;