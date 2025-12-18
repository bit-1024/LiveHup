// {{CODE-Cycle-Integration:
//   Task_ID: [#T005]
//   Timestamp: 2025-12-16T13:49:39Z
//   Phase: D-Develop
//   Context-Analysis: "实现Token黑名单机制，支持登出时使Token失效"
//   Principle_Applied: "Security, JWT-Best-Practices, Memory-Management"
// }}
// {{START_MODIFICATIONS}}

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Token黑名单存储
 * 使用内存存储，生产环境建议使用Redis
 * 结构: Map<tokenHash, { expiresAt: timestamp, reason: string }>
 */
class TokenBlacklist {
  constructor() {
    this.blacklist = new Map();
    this.cleanupInterval = null;
    // 每5分钟清理一次过期的黑名单条目
    this.startCleanup();
  }

  /**
   * 生成token的简短哈希（用于存储，节省内存）
   * @param {string} token - JWT token
   * @returns {string} token哈希
   */
  getTokenHash(token) {
    // 使用token的最后32个字符作为标识（JWT签名部分）
    return token.slice(-32);
  }

  /**
   * 将token加入黑名单
   * @param {string} token - JWT token
   * @param {string} reason - 加入黑名单的原因
   * @param {number} expiresAt - token过期时间戳（毫秒）
   */
  add(token, reason = 'logout', expiresAt = null) {
    const hash = this.getTokenHash(token);
    
    // 如果没有提供过期时间，尝试从token中解析
    if (!expiresAt) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          expiresAt = decoded.exp * 1000; // JWT的exp是秒，转换为毫秒
        } else {
          // 默认7天后过期
          expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        }
      } catch {
        expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      }
    }

    this.blacklist.set(hash, {
      expiresAt,
      reason,
      addedAt: Date.now()
    });

    logger.info('Token已加入黑名单', { reason, expiresAt: new Date(expiresAt).toISOString() });
  }

  /**
   * 检查token是否在黑名单中
   * @param {string} token - JWT token
   * @returns {boolean} 是否在黑名单中
   */
  isBlacklisted(token) {
    const hash = this.getTokenHash(token);
    const entry = this.blacklist.get(hash);
    
    if (!entry) {
      return false;
    }

    // 如果已过期，从黑名单中移除
    if (entry.expiresAt < Date.now()) {
      this.blacklist.delete(hash);
      return false;
    }

    return true;
  }

  /**
   * 从黑名单中移除token
   * @param {string} token - JWT token
   */
  remove(token) {
    const hash = this.getTokenHash(token);
    this.blacklist.delete(hash);
  }

  /**
   * 清理过期的黑名单条目
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [hash, entry] of this.blacklist.entries()) {
      if (entry.expiresAt < now) {
        this.blacklist.delete(hash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`清理了 ${cleaned} 个过期的黑名单条目`);
    }
  }

  /**
   * 启动定期清理任务
   */
  startCleanup() {
    // 每5分钟清理一次
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // 确保进程退出时清理定时器
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 停止清理任务
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取黑名单统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.blacklist.size,
      entries: Array.from(this.blacklist.entries()).map(([hash, entry]) => ({
        hash: hash.substring(0, 8) + '...',
        reason: entry.reason,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        addedAt: new Date(entry.addedAt).toISOString()
      }))
    };
  }

  /**
   * 清空黑名单（仅用于测试）
   */
  clear() {
    this.blacklist.clear();
  }
}

// 创建单例实例
const tokenBlacklist = new TokenBlacklist();

/**
 * 验证JWT token中间件
 * 支持黑名单检查
 */
const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        errorCode: 'TOKEN_MISSING'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 检查token是否在黑名单中
    if (tokenBlacklist.isBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: '认证令牌已失效，请重新登录',
        errorCode: 'TOKEN_REVOKED'
      });
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将用户信息和原始token附加到请求对象
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Token验证失败:', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期',
        errorCode: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
        errorCode: 'TOKEN_INVALID'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: '认证失败',
      errorCode: 'AUTH_FAILED'
    });
  }
};

/**
 * 可选的认证中间件
 * 如果提供了token则验证，否则继续（用于公开但可选认证的接口）
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 没有提供token，继续但不设置用户信息
    return next();
  }
  
  // 有token，使用正常的认证流程
  return authMiddleware(req, res, next);
};

/**
 * 验证管理员权限
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: '权限不足',
      errorCode: 'PERMISSION_DENIED'
    });
  }
  next();
};

/**
 * 验证超级管理员权限
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '需要超级管理员权限',
      errorCode: 'SUPER_ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * 验证用户角色
 * @param {string[]} allowedRoles - 允许的角色列表
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `需要以下角色之一: ${allowedRoles.join(', ')}`,
        errorCode: 'ROLE_REQUIRED'
      });
    }
    next();
  };
};

/**
 * 生成JWT token
 * @param {Object} payload - token载荷
 * @param {string|null} expiresIn - 过期时间
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = null) => {
  // 添加token ID用于追踪
  const tokenPayload = {
    ...payload,
    jti: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * 生成刷新token
 * @param {Object} payload - token载荷
 * @returns {string} 刷新token
 */
const generateRefreshToken = (payload) => {
  const tokenPayload = {
    ...payload,
    type: 'refresh',
    jti: `refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * 使token失效（加入黑名单）
 * @param {string} token - 要失效的token
 * @param {string} reason - 失效原因
 */
const revokeToken = (token, reason = 'logout') => {
  tokenBlacklist.add(token, reason);
};

/**
 * 使用户的所有token失效
 * 注意：这需要在生成token时记录用户的所有token
 * 当前实现仅支持单个token失效
 * @param {number|string} userId - 用户ID
 * @param {string} reason - 失效原因
 */
const revokeAllUserTokens = (userId, reason = 'logout_all') => {
  // 在内存存储中，我们无法追踪用户的所有token
  // 生产环境建议使用Redis存储用户token列表
  logger.warn('revokeAllUserTokens: 当前实现不支持批量失效，建议使用Redis');
};

/**
 * 验证刷新token并生成新的访问token
 * @param {string} refreshToken - 刷新token
 * @returns {Object} 新的token对
 */
const refreshAccessToken = (refreshToken) => {
  try {
    // 检查刷新token是否在黑名单中
    if (tokenBlacklist.isBlacklisted(refreshToken)) {
      throw new Error('刷新令牌已失效');
    }
    
    // 验证刷新token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // 确保是刷新token
    if (decoded.type !== 'refresh') {
      throw new Error('无效的刷新令牌类型');
    }
    
    // 生成新的访问token
    const { type, jti, iat, exp, ...payload } = decoded;
    const newAccessToken = generateToken(payload);
    
    return {
      success: true,
      accessToken: newAccessToken
    };
  } catch (error) {
    logger.error('刷新token失败:', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

// {{END_MODIFICATIONS}}

module.exports = {
  authMiddleware,
  optionalAuth,
  requireAdmin,
  requireSuperAdmin,
  requireRole,
  generateToken,
  generateRefreshToken,
  revokeToken,
  revokeAllUserTokens,
  refreshAccessToken,
  tokenBlacklist
};