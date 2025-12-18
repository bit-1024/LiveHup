// {{CODE-Cycle-Integration:
//   Task_ID: [#T007]
//   Timestamp: 2025-12-16T13:52:36Z
//   Phase: D-Develop
//   Context-Analysis: "创建增强的请求日志中间件，记录详细的请求和响应信息"
//   Principle_Applied: "Observability, Debugging, Security-Audit"
// }}
// {{START_MODIFICATIONS}}

const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * 请求日志配置
 */
const LOG_CONFIG = {
  // 是否记录请求体
  logRequestBody: process.env.LOG_REQUEST_BODY !== 'false',
  // 是否记录响应体
  logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  // 请求体最大记录长度
  maxBodyLength: 10000,
  // 敏感字段（不记录）
  sensitiveFields: ['password', 'password_hash', 'token', 'authorization', 'cookie', 'secret'],
  // 慢请求阈值（毫秒）
  slowRequestThreshold: 3000,
  // 不记录的路径
  excludePaths: ['/health', '/favicon.ico', '/api/health'],
  // 不记录的方法
  excludeMethods: []
};

/**
 * 生成请求ID
 */
const generateRequestId = () => {
  return uuidv4().replace(/-/g, '').substring(0, 16);
};

/**
 * 脱敏处理
 * @param {Object} obj - 要处理的对象
 * @returns {Object} 脱敏后的对象
 */
const sanitizeData = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // 检查是否是敏感字段
    if (LOG_CONFIG.sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * 截断长字符串
 * @param {string} str - 要截断的字符串
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的字符串
 */
const truncate = (str, maxLength = LOG_CONFIG.maxBodyLength) => {
  if (typeof str !== 'string') {
    str = JSON.stringify(str);
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength) + `... [truncated, total: ${str.length} chars]`;
};

/**
 * 获取客户端真实IP
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端IP
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

/**
 * 获取请求大小
 * @param {Object} req - Express请求对象
 * @returns {number} 请求大小（字节）
 */
const getRequestSize = (req) => {
  const contentLength = req.headers['content-length'];
  return contentLength ? parseInt(contentLength, 10) : 0;
};

/**
 * 请求日志中间件
 * 记录每个请求的详细信息
 */
const requestLogger = (options = {}) => {
  const config = { ...LOG_CONFIG, ...options };
  
  return (req, res, next) => {
    // 检查是否应该跳过此请求
    if (config.excludePaths.includes(req.path) || 
        config.excludeMethods.includes(req.method)) {
      return next();
    }
    
    // 生成请求ID并附加到请求对象
    const requestId = generateRequestId();
    req.requestId = requestId;
    
    // 记录请求开始时间
    const startTime = process.hrtime.bigint();
    const startDate = new Date();
    
    // 收集请求信息
    const requestInfo = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      contentLength: getRequestSize(req),
      referer: req.headers['referer'],
      userId: null, // 将在认证后填充
      timestamp: startDate.toISOString()
    };
    
    // 记录请求体（如果启用）
    if (config.logRequestBody && req.body && Object.keys(req.body).length > 0) {
      requestInfo.body = truncate(JSON.stringify(sanitizeData(req.body)));
    }
    
    // 记录查询参数
    if (Object.keys(req.query).length > 0) {
      requestInfo.query = sanitizeData(req.query);
    }
    
    // 记录请求开始
    logger.info('请求开始', requestInfo);
    
    // 捕获响应数据
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;
    
    res.send = function(body) {
      responseBody = body;
      return originalSend.call(this, body);
    };
    
    res.json = function(body) {
      responseBody = body;
      return originalJson.call(this, body);
    };
    
    // 响应完成时记录
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      
      // 构建响应信息
      const responseInfo = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration: `${duration.toFixed(2)}ms`,
        durationMs: duration,
        contentLength: res.get('Content-Length') || 0,
        userId: req.user?.id || req.user?.user_id || null
      };
      
      // 记录响应体（如果启用且是错误响应）
      if (config.logResponseBody && responseBody && res.statusCode >= 400) {
        try {
          const bodyStr = typeof responseBody === 'string' 
            ? responseBody 
            : JSON.stringify(responseBody);
          responseInfo.responseBody = truncate(bodyStr, 1000);
        } catch (e) {
          // 忽略序列化错误
        }
      }
      
      // 根据状态码选择日志级别
      if (res.statusCode >= 500) {
        logger.error('请求完成 - 服务器错误', responseInfo);
      } else if (res.statusCode >= 400) {
        logger.warn('请求完成 - 客户端错误', responseInfo);
      } else if (duration > config.slowRequestThreshold) {
        logger.warn('请求完成 - 慢请求', responseInfo);
      } else {
        logger.info('请求完成', responseInfo);
      }
    });
    
    // 处理响应关闭（客户端断开连接）
    res.on('close', () => {
      if (!res.finished) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        logger.warn('请求中断 - 客户端断开连接', {
          requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          duration: `${duration.toFixed(2)}ms`
        });
      }
    });
    
    next();
  };
};

/**
 * 错误日志中间件
 * 记录未捕获的错误
 */
const errorLogger = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  logger.error('未捕获的错误', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    userId: req.user?.id || req.user?.user_id || null,
    ip: getClientIp(req)
  });
  
  next(err);
};

/**
 * 审计日志中间件
 * 记录敏感操作
 */
const auditLogger = (action, options = {}) => {
  return (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    const logAudit = (success, details = {}) => {
      const auditInfo = {
        action,
        success,
        requestId: req.requestId,
        userId: req.user?.id || req.user?.user_id,
        username: req.user?.username,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        ...details
      };
      
      // 添加请求参数（脱敏）
      if (options.logParams && req.params) {
        auditInfo.params = sanitizeData(req.params);
      }
      
      if (options.logBody && req.body) {
        auditInfo.body = sanitizeData(req.body);
      }
      
      logger.info('审计日志', auditInfo);
    };
    
    res.send = function(body) {
      const success = res.statusCode < 400;
      logAudit(success, { statusCode: res.statusCode });
      return originalSend.call(this, body);
    };
    
    res.json = function(body) {
      const success = res.statusCode < 400;
      logAudit(success, { statusCode: res.statusCode });
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * 性能监控中间件
 * 记录请求性能指标
 */
const performanceLogger = (options = {}) => {
  const { 
    sampleRate = 1.0, // 采样率（0-1）
    slowThreshold = 1000 // 慢请求阈值（毫秒）
  } = options;
  
  return (req, res, next) => {
    // 采样
    if (Math.random() > sampleRate) {
      return next();
    }
    
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      const duration = Number(endTime - startTime) / 1000000;
      
      const metrics = {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration: duration.toFixed(2),
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        }
      };
      
      if (duration > slowThreshold) {
        logger.warn('性能警告 - 慢请求', metrics);
      } else {
        logger.debug('性能指标', metrics);
      }
    });
    
    next();
  };
};

// {{END_MODIFICATIONS}}

module.exports = {
  requestLogger,
  errorLogger,
  auditLogger,
  performanceLogger,
  sanitizeData,
  getClientIp,
  generateRequestId
};