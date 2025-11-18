const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/auth');

// 用户登录（移动端）
router.post('/login', usersController.loginUser);

// 获取当前登录用户基本信息
router.get('/profile', authMiddleware, usersController.getSelfProfile);

// 获取当前登录用户积分概要
router.get('/points/summary', authMiddleware, usersController.getSelfPointsSummary);

// 当前登录用户修改自己的密码
router.post('/change-password', authMiddleware, usersController.changeOwnPassword);

module.exports = router;
