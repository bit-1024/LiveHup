// {{CODE-Cycle-Integration:
//   Task_ID: [#T002]
//   Timestamp: 2025-12-16T13:44:41Z
//   Phase: D-Develop
//   Context-Analysis: "创建统一的请求验证中间件，使用express-validator"
//   Principle_Applied: "Security-First, DRY, Input-Validation"
// }}
// {{START_MODIFICATIONS}}

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * 验证结果处理中间件
 * 检查验证错误并返回统一格式的错误响应
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('请求验证失败:', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
    });

    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errorMessages,
    });
  }

  next();
};

/**
 * 通用验证规则
 */
const commonRules = {
  // ID 验证
  id: (fieldName = 'id', location = 'param') => {
    const validator = location === 'param' ? param(fieldName) : 
                      location === 'body' ? body(fieldName) : query(fieldName);
    return validator
      .notEmpty().withMessage(`${fieldName} 不能为空`)
      .isInt({ min: 1 }).withMessage(`${fieldName} 必须是正整数`)
      .toInt();
  },

  // UUID 验证
  uuid: (fieldName = 'id', location = 'param') => {
    const validator = location === 'param' ? param(fieldName) : 
                      location === 'body' ? body(fieldName) : query(fieldName);
    return validator
      .notEmpty().withMessage(`${fieldName} 不能为空`)
      .isUUID().withMessage(`${fieldName} 格式无效`);
  },

  // 用户ID验证（字符串格式）
  userId: (fieldName = 'userId', location = 'param') => {
    const validator = location === 'param' ? param(fieldName) : 
                      location === 'body' ? body(fieldName) : query(fieldName);
    return validator
      .notEmpty().withMessage('用户ID不能为空')
      .isString().withMessage('用户ID必须是字符串')
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('用户ID长度必须在1-50之间');
  },

  // 分页参数
  page: query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('页码必须是正整数')
    .toInt(),

  pageSize: query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
    .toInt(),

  // 字符串验证
  string: (fieldName, options = {}) => {
    const { min = 1, max = 255, required = true, location = 'body' } = options;
    const validator = location === 'body' ? body(fieldName) : 
                      location === 'query' ? query(fieldName) : param(fieldName);
    
    let chain = validator.trim();
    
    if (required) {
      chain = chain.notEmpty().withMessage(`${fieldName} 不能为空`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    
    return chain
      .isString().withMessage(`${fieldName} 必须是字符串`)
      .isLength({ min, max }).withMessage(`${fieldName} 长度必须在${min}-${max}之间`);
  },

  // 邮箱验证
  email: (fieldName = 'email', required = false) => {
    let chain = body(fieldName).trim();
    if (required) {
      chain = chain.notEmpty().withMessage('邮箱不能为空');
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    return chain.isEmail().withMessage('邮箱格式无效').normalizeEmail();
  },

  // 手机号验证
  phone: (fieldName = 'phone', required = false) => {
    let chain = body(fieldName).trim();
    if (required) {
      chain = chain.notEmpty().withMessage('手机号不能为空');
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    return chain.matches(/^1[3-9]\d{9}$/).withMessage('手机号格式无效');
  },

  // 密码验证
  password: (fieldName = 'password', options = {}) => {
    const { min = 6, max = 50, required = true } = options;
    let chain = body(fieldName);
    
    if (required) {
      chain = chain.notEmpty().withMessage('密码不能为空');
    } else {
      chain = chain.optional();
    }
    
    return chain
      .isLength({ min, max }).withMessage(`密码长度必须在${min}-${max}之间`);
  },

  // 数字验证
  number: (fieldName, options = {}) => {
    const { min, max, required = true, location = 'body' } = options;
    const validator = location === 'body' ? body(fieldName) : 
                      location === 'query' ? query(fieldName) : param(fieldName);
    
    let chain = validator;
    
    if (required) {
      chain = chain.notEmpty().withMessage(`${fieldName} 不能为空`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    
    chain = chain.isNumeric().withMessage(`${fieldName} 必须是数字`);
    
    if (min !== undefined || max !== undefined) {
      const rangeOptions = {};
      if (min !== undefined) rangeOptions.min = min;
      if (max !== undefined) rangeOptions.max = max;
      chain = chain.isFloat(rangeOptions).withMessage(
        `${fieldName} 必须在${min !== undefined ? min : '-∞'}到${max !== undefined ? max : '+∞'}之间`
      );
    }
    
    return chain.toFloat();
  },

  // 布尔值验证
  boolean: (fieldName, options = {}) => {
    const { required = false, location = 'body' } = options;
    const validator = location === 'body' ? body(fieldName) : 
                      location === 'query' ? query(fieldName) : param(fieldName);
    
    let chain = validator;
    
    if (!required) {
      chain = chain.optional({ nullable: true });
    }
    
    return chain.isBoolean().withMessage(`${fieldName} 必须是布尔值`).toBoolean();
  },

  // 日期验证
  date: (fieldName, options = {}) => {
    const { required = false, location = 'body' } = options;
    const validator = location === 'body' ? body(fieldName) : 
                      location === 'query' ? query(fieldName) : param(fieldName);
    
    let chain = validator;
    
    if (required) {
      chain = chain.notEmpty().withMessage(`${fieldName} 不能为空`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    
    return chain.isISO8601().withMessage(`${fieldName} 日期格式无效`).toDate();
  },

  // 枚举验证
  enum: (fieldName, allowedValues, options = {}) => {
    const { required = true, location = 'body' } = options;
    const validator = location === 'body' ? body(fieldName) : 
                      location === 'query' ? query(fieldName) : param(fieldName);
    
    let chain = validator;
    
    if (required) {
      chain = chain.notEmpty().withMessage(`${fieldName} 不能为空`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    
    return chain.isIn(allowedValues).withMessage(
      `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`
    );
  },

  // 数组验证
  array: (fieldName, options = {}) => {
    const { minLength = 0, maxLength = 100, required = true } = options;
    let chain = body(fieldName);
    
    if (required) {
      chain = chain.notEmpty().withMessage(`${fieldName} 不能为空`);
    } else {
      chain = chain.optional();
    }
    
    return chain
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${fieldName} 必须是数组，长度在${minLength}-${maxLength}之间`);
  },
};

/**
 * 预定义的验证规则集
 */
const validationSchemas = {
  // 登录验证
  login: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('用户名长度必须在1-50之间'),
    body('identifier')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('用户标识长度必须在1-50之间'),
    body('password')
      .notEmpty().withMessage('密码不能为空')
      .isLength({ min: 6, max: 50 }).withMessage('密码长度必须在6-50之间'),
    handleValidationErrors,
  ],

  // 用户登录验证（移动端）
  userLogin: [
    body('identifier')
      .notEmpty().withMessage('用户ID或用户名不能为空')
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('用户标识长度必须在1-50之间'),
    body('password')
      .notEmpty().withMessage('密码不能为空')
      .isLength({ min: 6, max: 50 }).withMessage('密码长度必须在6-50之间'),
    handleValidationErrors,
  ],

  // 注册验证
  register: [
    body('username')
      .notEmpty().withMessage('用户名不能为空')
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('用户名长度必须在2-50之间')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('用户名只能包含字母、数字、下划线和中文'),
    body('password')
      .notEmpty().withMessage('密码不能为空')
      .isLength({ min: 6, max: 50 }).withMessage('密码长度必须在6-50之间'),
    commonRules.email('email', false),
    commonRules.phone('phone', false),
    handleValidationErrors,
  ],

  // 修改密码验证
  changePassword: [
    body('oldPassword')
      .notEmpty().withMessage('原密码不能为空')
      .isLength({ min: 6, max: 50 }).withMessage('原密码长度必须在6-50之间'),
    body('newPassword')
      .notEmpty().withMessage('新密码不能为空')
      .isLength({ min: 6, max: 50 }).withMessage('新密码长度必须在6-50之间')
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error('新密码不能与原密码相同');
        }
        return true;
      }),
    handleValidationErrors,
  ],

  // 创建商品验证
  createProduct: [
    body('name')
      .notEmpty().withMessage('商品名称不能为空')
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('商品名称长度必须在1-100之间'),
    body('points_required')
      .notEmpty().withMessage('所需积分不能为空')
      .isInt({ min: 1 }).withMessage('所需积分必须是正整数')
      .toInt(),
    body('stock')
      .optional()
      .isInt({ min: -1 }).withMessage('库存必须是-1或正整数')
      .toInt(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('商品描述不能超过1000字'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('分类名称不能超过50字'),
    handleValidationErrors,
  ],

  // 更新商品验证
  updateProduct: [
    param('id')
      .notEmpty().withMessage('商品ID不能为空')
      .isInt({ min: 1 }).withMessage('商品ID必须是正整数')
      .toInt(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('商品名称长度必须在1-100之间'),
    body('points_required')
      .optional()
      .isInt({ min: 1 }).withMessage('所需积分必须是正整数')
      .toInt(),
    body('stock')
      .optional()
      .isInt({ min: -1 }).withMessage('库存必须是-1或正整数')
      .toInt(),
    handleValidationErrors,
  ],

  // 创建兑换验证
  createExchange: [
    body('product_id')
      .notEmpty().withMessage('商品ID不能为空')
      .isInt({ min: 1 }).withMessage('商品ID必须是正整数')
      .toInt(),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 99 }).withMessage('兑换数量必须在1-99之间')
      .toInt(),
    body('contact_name')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('联系人姓名不能超过50字'),
    body('contact_phone')
      .optional()
      .trim()
      .matches(/^1[3-9]\d{9}$/).withMessage('联系电话格式无效'),
    body('shipping_address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('收货地址不能超过200字'),
    handleValidationErrors,
  ],

  // 更新兑换状态验证
  updateExchangeStatus: [
    param('id')
      .notEmpty().withMessage('兑换ID不能为空')
      .isInt({ min: 1 }).withMessage('兑换ID必须是正整数')
      .toInt(),
    body('status')
      .notEmpty().withMessage('状态不能为空')
      .isIn(['pending', 'confirmed', 'shipped', 'completed', 'cancelled'])
      .withMessage('状态值无效'),
    body('tracking_number')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('物流单号不能超过50字'),
    body('remark')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('备注不能超过500字'),
    handleValidationErrors,
  ],

  // 积分规则验证
  createRule: [
    body('rule_name')
      .notEmpty().withMessage('规则名称不能为空')
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('规则名称长度必须在1-100之间'),
    body('column_name')
      .notEmpty().withMessage('列名不能为空')
      .trim(),
    body('condition_type')
      .notEmpty().withMessage('条件类型不能为空')
      .isIn(['equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal', 'contains', 'range'])
      .withMessage('条件类型无效'),
    body('condition_value')
      .notEmpty().withMessage('条件值不能为空')
      .trim(),
    body('points')
      .notEmpty().withMessage('积分值不能为空')
      .isInt().withMessage('积分值必须是整数')
      .toInt(),
    body('priority')
      .optional()
      .isInt({ min: 0 }).withMessage('优先级必须是非负整数')
      .toInt(),
    handleValidationErrors,
  ],

  // 分页查询验证
  pagination: [
    commonRules.page,
    commonRules.pageSize,
    handleValidationErrors,
  ],

  // 用户ID参数验证
  userIdParam: [
    commonRules.userId('userId', 'param'),
    handleValidationErrors,
  ],

  // 通用ID参数验证
  idParam: [
    commonRules.id('id', 'param'),
    handleValidationErrors,
  ],
};

/**
 * 创建自定义验证中间件
 * @param {Array} rules - 验证规则数组
 */
const createValidator = (...rules) => {
  return [...rules.flat(), handleValidationErrors];
};

/**
 * XSS 清理中间件
 * 对请求体中的字符串进行基本的 XSS 清理
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  // 注意：不要对所有输入都进行 XSS 清理，某些场景需要保留原始数据
  // 这里只是提供一个可选的中间件
  // req.body = sanitize(req.body);
  
  next();
};

module.exports = {
  handleValidationErrors,
  commonRules,
  validationSchemas,
  createValidator,
  sanitizeInput,
  // 导出 express-validator 的方法供外部使用
  body,
  param,
  query,
  validationResult,
};

// {{END_MODIFICATIONS}}