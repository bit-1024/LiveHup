const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 获取用户列表（移动端公开接口用于验证用户，管理员接口）
router.get('/', usersController.getUsers);

// 获取用户统计
router.get('/stats', authMiddleware, usersController.getUserStats);

// 导出用户数据
router.get('/export', authMiddleware, requireAdmin, usersController.exportUsers);

// 重置所有用户积分（管理员）- 必须在 /:userId 路由之前
router.post('/reset-all/points', authMiddleware, requireAdmin, usersController.resetAllPoints);

// 清理所有数据（管理员测试用）
router.delete('/clear-all', authMiddleware, requireAdmin, usersController.clearAllData);

// 获取用户详情（管理员）
router.get('/:userId/detail', authMiddleware, usersController.getUserDetail);

// 获取用户基本信息（移动端公开接口）
router.get('/:userId', usersController.getUserPoints);

// 获取用户积分（可公开访问，用于手机端查询，兼容旧路由）
router.get('/:userId/points', usersController.getUserPoints);

// 手动调整用户积分（管理员）
router.post('/:userId/adjust', authMiddleware, requireAdmin, usersController.adjustPoints);

// 重置用户积分（管理员）
router.post('/:userId/reset', authMiddleware, requireAdmin, usersController.resetPoints);

// 删除用户（管理员）
router.delete('/:userId', authMiddleware, requireAdmin, usersController.deleteUser);

// 批量删除用户（管理员）
router.post('/batch/delete', authMiddleware, requireAdmin, usersController.batchDeleteUsers);

module.exports = router;