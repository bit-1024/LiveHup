// {{CODE-Cycle-Integration:
//   Task_ID: [#T008]
//   Timestamp: 2025-12-16T13:53:43Z
//   Phase: D-Develop
//   Context-Analysis: "更新app.js，集成所有新创建的中间件"
//   Principle_Applied: "Security, Performance, Observability"
// }}
// {{START_MODIFICATIONS}}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { testConnection } = require('./config/database');

// 导入自定义中间件
const { apiLimiter, loginLimiter } = require('./middleware/rateLimit');
const { requestLogger, errorLogger, performanceLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 跨域配置（必须在helmet之前）
const corsOptions = {
  origin: (origin, callback) => {
    // 允许的来源列表
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // 允许无来源的请求（如移动应用或Postman）
    if (!origin) {
      return callback(null, true);
    }
    
    // 开发环境允许所有来源
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 检查来源是否在允许列表中
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('不允许的跨域请求'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// 压缩响应
app.use(compression({
  // 只压缩大于1KB的响应
  threshold: 1024,
  // 压缩级别
  level: 6,
  // 过滤函数
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// 请求日志（增强版）
if (process.env.NODE_ENV === 'production') {
  // 生产环境使用自定义请求日志
  app.use(requestLogger());
} else {
  // 开发环境使用morgan + 自定义日志
  app.use(morgan('dev'));
  app.use(requestLogger({ logResponseBody: true }));
}

// 性能监控（可选，采样率10%）
if (process.env.ENABLE_PERFORMANCE_LOG === 'true') {
  app.use(performanceLogger({ sampleRate: 0.1 }));
}

// 解析请求体
app.use(express.json({
  limit: '10mb',
  // 验证JSON格式
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: '无效的JSON格式'
      });
      throw new Error('无效的JSON格式');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全局API速率限制
app.use('/api', apiLimiter);

// 静态文件（带缓存控制）
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true
}));

// 健康检查（不受速率限制）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API版本信息
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }
  });
});

// API路由（带特定速率限制）
app.use('/api/auth', loginLimiter, require('./routes/auth'));
// 注意：uploadLimiter 已移至 import 路由内部，只应用于实际的文件上传端点
// 避免对 /history, /detail, /template 等查询接口造成误限制
app.use('/api/import', require('./routes/import'));
app.use('/api/rules', require('./routes/rules'));
app.use('/api/users', require('./routes/users'));
app.use('/api/points', require('./routes/points'));
app.use('/api/products', require('./routes/products'));
app.use('/api/exchanges', require('./routes/exchanges'));
app.use('/api/qrcode', require('./routes/qrcode'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/user-auth', loginLimiter, require('./routes/userAuth'));

// 错误日志中间件
app.use(errorLogger);

// 404处理（使用统一错误处理）
app.use(notFoundHandler);

// 全局错误处理（使用统一错误处理中间件）
app.use(errorHandler);

// {{END_MODIFICATIONS}}

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    // 启动HTTP服务器
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 服务器启动成功`);
      logger.info(`📍 地址: http://${HOST}:${PORT}`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 健康检查: http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 启动
startServer();

module.exports = app;
