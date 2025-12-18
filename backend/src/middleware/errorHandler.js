// {{CODE-Cycle-Integration:
//   Task_ID: [#T003]
//   Timestamp: 2025-12-16T13:46:04Z
//   Phase: D-Develop
//   Context-Analysis: "创建统一错误处理中间件，标准化错误响应格式"
//   Principle_Applied: "DRY, Error-Handling-Best-Practices, Security"
// }}
// {{START_MODIFICATIONS}}

const logger = require('../config/logger');

/**
 * 自定义应用错误类
 * 用于创建带有状态码和错误代码的错误
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // 标记为可操作错误（预期的错误）
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      success: false,
      message: this.message,
      errorCode: this.errorCode,
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack }),
    };
  }
}

/**
 * 预定义的错误类型
 */
const ErrorTypes = {
  // 400 Bad Request
  BAD_REQUEST: (message = '请求参数错误') => new AppError(message, 400, 'BAD_REQUEST'),
  VALIDATION_ERROR: (message = '数据验证失败') => new AppError(message, 400, 'VALIDATION_ERROR'),
  INVALID_INPUT: (message = '输入数据无效') => new AppError(message, 400, 'INVALID_INPUT'),

  // 401 Unauthorized
  UNAUTHORIZED: (message = '未授权访问') => new AppError(message, 401, 'UNAUTHORIZED'),
  TOKEN_EXPIRED: (message = '认证令牌已过期') => new AppError(message, 401, 'TOKEN_EXPIRED'),
  TOKEN_INVALID: (message = '无效的认证令牌') => new AppError(message, 401, 'TOKEN_INVALID'),
  LOGIN_REQUIRED: (message = '请先登录') => new AppError(message, 401, 'LOGIN_REQUIRED'),

  // 403 Forbidden
  FORBIDDEN: (message = '禁止访问') => new AppError(message, 403, 'FORBIDDEN'),
  PERMISSION_DENIED: (message = '权限不足') => new AppError(message, 403, 'PERMISSION_DENIED'),
  ADMIN_REQUIRED: (message = '需要管理员权限') => new AppError(message, 403, 'ADMIN_REQUIRED'),

  // 404 Not Found
  NOT_FOUND: (message = '资源不存在') => new AppError(message, 404, 'NOT_FOUND'),
  USER_NOT_FOUND: (message = '用户不存在') => new AppError(message, 404, 'USER_NOT_FOUND'),
  PRODUCT_NOT_FOUND: (message = '商品不存在') => new AppError(message, 404, 'PRODUCT_NOT_FOUND'),
  EXCHANGE_NOT_FOUND: (message = '兑换记录不存在') => new AppError(message, 404, 'EXCHANGE_NOT_FOUND'),

  // 409 Conflict
  CONFLICT: (message = '资源冲突') => new AppError(message, 409, 'CONFLICT'),
  DUPLICATE_ENTRY: (message = '数据已存在') => new AppError(message, 409, 'DUPLICATE_ENTRY'),
  USERNAME_EXISTS: (message = '用户名已存在') => new AppError(message, 409, 'USERNAME_EXISTS'),

  // 422 Unprocessable Entity
  UNPROCESSABLE: (message = '无法处理的请求') => new AppError(message, 422, 'UNPROCESSABLE'),
  INSUFFICIENT_POINTS: (message = '积分不足') => new AppError(message, 422, 'INSUFFICIENT_POINTS'),
  INSUFFICIENT_STOCK: (message = '库存不足') => new AppError(message, 422, 'INSUFFICIENT_STOCK'),
  PRODUCT_UNAVAILABLE: (message = '商品已下架') => new AppError(message, 422, 'PRODUCT_UNAVAILABLE'),

  // 429 Too Many Requests
  RATE_LIMIT: (message = '请求过于频繁') => new AppError(message, 429, 'RATE_LIMIT'),

  // 500 Internal Server Error
  INTERNAL_ERROR: (message = '服务器内部错误') => new AppError(message, 500, 'INTERNAL_ERROR'),
  DATABASE_ERROR: (message = '数据库错误') => new AppError(message, 500, 'DATABASE_ERROR'),
  FILE_UPLOAD_ERROR: (message = '文件上传失败') => new AppError(message, 500, 'FILE_UPLOAD_ERROR'),

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: (message = '服务暂时不可用') => new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * 异步错误包装器
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 * @param {Function} fn - 异步处理函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 处理特定类型的错误
 */
const handleSpecificErrors = (err) => {
  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return ErrorTypes.TOKEN_INVALID();
  }
  if (err.name === 'TokenExpiredError') {
    return ErrorTypes.TOKEN_EXPIRED();
  }

  // MySQL 错误
  if (err.code === 'ER_DUP_ENTRY') {
    return ErrorTypes.DUPLICATE_ENTRY('数据已存在，请检查是否重复');
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ErrorTypes.BAD_REQUEST('关联数据不存在');
  }
  if (err.code === 'ER_DATA_TOO_LONG') {
    return ErrorTypes.BAD_REQUEST('数据长度超出限制');
  }
  if (err.code === 'ECONNREFUSED') {
    return ErrorTypes.DATABASE_ERROR('数据库连接失败');
  }

  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ErrorTypes.BAD_REQUEST('文件大小超出限制');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return ErrorTypes.BAD_REQUEST('文件数量超出限制');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ErrorTypes.BAD_REQUEST('不支持的文件字段');
  }

  // 语法错误（JSON 解析失败等）
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ErrorTypes.BAD_REQUEST('请求体格式错误，请检查 JSON 格式');
  }

  return null;
};

/**
 * 全局错误处理中间件
 * 必须放在所有路由之后
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应已经发送，交给默认错误处理
  if (res.headersSent) {
    return next(err);
  }

  // 尝试处理特定类型的错误
  const specificError = handleSpecificErrors(err);
  if (specificError) {
    err = specificError;
  }

  // 确定状态码
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';
  const isOperational = err.isOperational || false;

  // 记录错误日志
  const logData = {
    errorCode,
    statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || req.user?.user_id,
    userAgent: req.get('User-Agent'),
  };

  if (statusCode >= 500 || !isOperational) {
    // 服务器错误或非预期错误，记录完整堆栈
    logger.error('服务器错误:', {
      ...logData,
      stack: err.stack,
    });
  } else {
    // 客户端错误，只记录基本信息
    logger.warn('客户端错误:', logData);
  }

  // 构建响应
  const response = {
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? '服务器内部错误，请稍后重试'
      : err.message,
    errorCode,
  };

  // 开发环境下返回更多调试信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  // 添加验证错误详情
  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 处理中间件
 * 处理未匹配的路由
 */
const notFoundHandler = (req, res, next) => {
  const error = ErrorTypes.NOT_FOUND(`接口不存在: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * 创建统一的成功响应
 * @param {Object} res - Express 响应对象
 * @param {Object} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP 状态码
 */
const successResponse = (res, data = null, message = '操作成功', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * 创建分页响应
 * @param {Object} res - Express 响应对象
 * @param {Array} list - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 成功消息
 */
const paginatedResponse = (res, list, pagination, message = '获取成功') => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      list,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
    },
    pagination,
  });
};

/**
 * 控制器方法包装器
 * 提供统一的错误处理和响应格式
 * @param {Function} handler - 控制器处理函数
 */
const controllerWrapper = (handler) => {
  return asyncHandler(async (req, res, next) => {
    const result = await handler(req, res, next);
    
    // 如果处理函数返回了结果，自动发送成功响应
    if (result !== undefined && !res.headersSent) {
      if (result && result.list && result.pagination) {
        return paginatedResponse(res, result.list, result.pagination);
      }
      return successResponse(res, result);
    }
  });
};

module.exports = {
  AppError,
  ErrorTypes,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  successResponse,
  paginatedResponse,
  controllerWrapper,
};

// {{END_MODIFICATIONS}}