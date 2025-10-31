const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// 验证JWT token
const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将用户信息附加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Token验证失败:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
};

// 验证管理员权限
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }
  next();
};

// 验证超级管理员权限
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '需要超级管理员权限'
    });
  }
  next();
};

// 生成JWT token
const generateToken = (payload, expiresIn = null) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 生成刷新token
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

module.exports = {
  authMiddleware,
  requireAdmin,
  requireSuperAdmin,
  generateToken,
  generateRefreshToken
};