// {{CODE-Cycle-Integration:
//   Task_ID: [#T001]
//   Timestamp: 2025-12-16T13:43:49Z
//   Phase: D-Develop
//   Context-Analysis: "创建API速率限制中间件，防止暴力攻击和滥用"
//   Principle_Applied: "Security-First, KISS, DRY"
// }}
// {{START_MODIFICATIONS}}

const logger = require('../config/logger');

/**
 * 内存存储的速率限制器
 * 生产环境建议使用 Redis 存储
 */
class RateLimitStore {
  constructor() {
    this.requests = new Map();
    // 每分钟清理过期记录
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * 获取请求记录
   */
  get(key) {
    const record = this.requests.get(key);
    if (!record) {
      return null;
    }
    // 检查是否过期
    if (Date.now() > record.resetTime) {
      this.requests.delete(key);
      return null;
    }
    return record;
  }

  /**
   * 增加请求计数
   */
  increment(key, windowMs) {
    const now = Date.now();
    let record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      record.count++;
    }

    this.requests.set(key, record);
    return record;
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * 销毁存储
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// 全局存储实例
const globalStore = new RateLimitStore();

/**
 * 创建速率限制中间件
 * @param {Object} options 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒），默认 15 分钟
 * @param {number} options.max - 时间窗口内最大请求数，默认 100
 * @param {string} options.message - 超限时的错误消息
 * @param {Function} options.keyGenerator - 生成限制键的函数
 * @param {boolean} options.skipSuccessfulRequests - 是否跳过成功请求的计数
 * @param {Function} options.skip - 跳过限制的条件函数
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 分钟
    max = 100,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown',
    skipSuccessfulRequests = false,
    skip = () => false,
    store = globalStore,
  } = options;

  return (req, res, next) => {
    // 检查是否跳过
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const record = store.increment(key, windowMs);

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    // 检查是否超限
    if (record.count > max) {
      logger.warn(`速率限制触发: ${key}, 请求数: ${record.count}/${max}`);
      
      res.setHeader('Retry-After', Math.ceil((record.resetTime - Date.now()) / 1000));
      
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000),
      });
    }

    // 如果配置了跳过成功请求，需要在响应后处理
    if (skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function (...args) {
        if (res.statusCode < 400) {
          record.count--;
        }
        originalEnd.apply(res, args);
      };
    }

    next();
  };
};

/**
 * 预定义的速率限制器
 */

// 通用 API 限制：每 15 分钟 500 次请求（提高限制以适应管理后台频繁操作）
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'API 请求过于频繁，请稍后再试',
});

// 管理后台专用限制：每 15 分钟 1000 次请求（认证用户有更高限制）
const adminApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'API 请求过于频繁，请稍后再试',
  keyGenerator: (req) => {
    // 使用用户ID作为键（如果已认证），否则使用IP
    return req.user?.id ? `admin:${req.user.id}` : req.ip || req.connection.remoteAddress || 'unknown';
  },
});

// 登录限制：每 15 分钟 5 次失败尝试
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '登录尝试次数过多，请 15 分钟后再试',
  keyGenerator: (req) => {
    // 使用 IP + 用户名组合作为键
    const identifier = req.body?.username || req.body?.identifier || '';
    return `login:${req.ip}:${identifier}`;
  },
  skipSuccessfulRequests: true, // 成功登录不计入限制
});

// 注册限制：每小时 3 次
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: '注册请求过于频繁，请 1 小时后再试',
});

// 密码重置限制：每小时 3 次
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: '密码重置请求过于频繁，请 1 小时后再试',
});

// 文件上传限制：每小时 20 次
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: '文件上传过于频繁，请稍后再试',
});

// 兑换限制：每分钟 5 次
const exchangeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: '兑换请求过于频繁，请稍后再试',
  keyGenerator: (req) => `exchange:${req.user?.user_id || req.ip}`,
});

// 严格限制：每分钟 10 次（用于敏感操作）
const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: '操作过于频繁，请稍后再试',
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  adminApiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  uploadLimiter,
  exchangeLimiter,
  strictLimiter,
  RateLimitStore,
};

// {{END_MODIFICATIONS}}