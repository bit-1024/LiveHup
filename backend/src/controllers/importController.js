// {{CODE-Cycle-Integration:
//   Task_ID: [#T006]
//   Timestamp: 2025-12-16T13:50:58Z
//   Phase: D-Develop
//   Context-Analysis: "优化大文件导入，实现流式处理和分批处理"
//   Principle_Applied: "Performance, Memory-Management, Streaming"
// }}
// {{START_MODIFICATIONS}}

const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../config/database');
const logger = require('../config/logger');
const { DEFAULT_PASSWORD_HASH } = require('../utils/password');
const { asyncHandler, ErrorTypes } = require('../middleware/errorHandler');

const pipelineAsync = promisify(pipeline);

/**
 * 导入配置
 */
const IMPORT_CONFIG = {
  // 批处理大小（每批处理的行数）
  BATCH_SIZE: 100,
  // 最大文件大小（50MB）
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  // 最大行数限制
  MAX_ROWS: 100000,
  // 支持的文件类型
  SUPPORTED_EXTENSIONS: ['xlsx', 'xls', 'csv'],
  // 进度报告间隔（每处理多少行报告一次）
  PROGRESS_INTERVAL: 500
};

class ImportController {
  constructor() {
    // 绑定到实例，确保作为 Express 处理函数时 this 指向正确
    this.importFile = this.importFile.bind(this);
    this.importFileStreaming = this.importFileStreaming.bind(this);
    this.getImportHistory = this.getImportHistory.bind(this);
    this.getImportDetail = this.getImportDetail.bind(this);
    this.downloadTemplate = this.downloadTemplate.bind(this);
    this.clearHistory = this.clearHistory.bind(this);
    this.getImportProgress = this.getImportProgress.bind(this);
    
    // 存储导入进度（用于大文件导入时的进度查询）
    this.importProgress = new Map();
  }

  /**
   * 标准化字段名，去除空白和全角字符进行统一
   */
  normalizeKey(key) {
    if (key === undefined || key === null) {
      return '';
    }
    return String(key)
      .replace(/\uFEFF/g, '')
      .replace(/\s+/g, '')
      .replace(/　/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * 获取数据行中的字段值，自动匹配不同写法的列名
   */
  getRowValue(row, keys) {
    if (!row || typeof row !== 'object') {
      return undefined;
    }

    const normalizedMap = new Map();
    for (const [rawKey, value] of Object.entries(row)) {
      const normalizedKey = this.normalizeKey(rawKey);
      if (normalizedKey) {
        normalizedMap.set(normalizedKey, value);
      }
    }

    const targets = Array.isArray(keys) ? keys : [keys];
    for (const key of targets) {
      const normalizedKey = this.normalizeKey(key);
      if (!normalizedKey) continue;
      if (normalizedMap.has(normalizedKey)) {
        return normalizedMap.get(normalizedKey);
      }
    }

    return undefined;
  }

    /**
   * 将含中文或常见格式的时长字符串转换为分钟数
   * 支持示例：
   * - "0小时53分15秒" => 53.25
   * - "1小时30分" => 90
   * - "45分钟" / "45分" / "45min" => 45
   * - "01:30:00" => 90
   * - "30" => 30
   */
  parseTimeToMinutes(timeStr) {
    if (timeStr === undefined || timeStr === null) {
      return 0;
    }

    const str = String(timeStr).trim();
    if (!str) {
      return 0;
    }

    const toNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    // 处理 HH:MM(:SS) 或 MM:SS 形式
    if (/^\d{1,3}:\d{1,2}(:\d{1,2})?$/.test(str)) {
      const parts = str.split(":").map(toNumber);
      if (parts.length === 3) {
        return parts[0] * 60 + parts[1] + parts[2] / 60;
      }
      if (parts.length === 2) {
        const [first, second] = parts;
        // 当首段 >= 24 时视为“分钟:秒”，否则默认“小时:分钟”
        return (first >= 24 ? first : first * 60) + second / 60;
      }
    }

    let totalMinutes = 0;
    let matched = false;

    const collectMatches = (regex, factor) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(str)) !== null) {
        totalMinutes += parseFloat(match[1]) * factor;
        matched = true;
      }
    };

    collectMatches(/(\d+(?:\.\d+)?)\s*(小时|小時|时|hour|hours|hr|hrs|h)/gi, 60);
    collectMatches(/(\d+(?:\.\d+)?)\s*(分钟|分|minute(?:s)?|min(?:s)?|m(?![a-zA-Z]))/gi, 1);
    collectMatches(/(\d+(?:\.\d+)?)\s*(秒钟|秒|second(?:s)?|sec(?:s)?|s(?![a-zA-Z]))/gi, 1 / 60);

    if (matched) {
      return totalMinutes;
    }

    const numericFallback = str.match(/(\d+(?:\.\d+)?)/);
    if (numericFallback) {
      return parseFloat(numericFallback[1]);
    }

    return 0;
  }

  /**
   * 解析日期字符串为 MySQL 格式的日期时间
   * 支持多种常见日期格式
   */
  parseDateToMySQL(dateStr) {
    if (dateStr === undefined || dateStr === null) {
      return null;
    }

    const str = String(dateStr).trim();
    if (!str) {
      return null;
    }

    // 尝试使用 moment 解析多种格式
    const formats = [
      'YYYY-MM-DD HH:mm:ss',
      'YYYY/MM/DD HH:mm:ss',
      'YYYY-MM-DD HH:mm',
      'YYYY/MM/DD HH:mm',
      'YYYY-MM-DD',
      'YYYY/MM/DD',
      'MM/DD/YYYY HH:mm:ss',
      'MM/DD/YYYY',
      'DD/MM/YYYY HH:mm:ss',
      'DD/MM/YYYY',
      'YYYY年MM月DD日 HH:mm:ss',
      'YYYY年MM月DD日 HH:mm',
      'YYYY年MM月DD日',
      'MM月DD日 HH:mm',
      // Excel 日期格式（数字）
    ];

    // 首先检查是否是 Excel 序列号日期（数字格式）
    const numValue = Number(str);
    if (!isNaN(numValue) && numValue > 25569 && numValue < 100000) {
      // Excel 日期序列号转换（Excel 日期从 1900-01-01 开始，但有 1900 年闰年 bug）
      const excelEpoch = moment('1899-12-30');
      const parsedDate = excelEpoch.add(numValue, 'days');
      if (parsedDate.isValid()) {
        return parsedDate.format('YYYY-MM-DD HH:mm:ss');
      }
    }

    // 尝试各种格式解析
    for (const format of formats) {
      const parsed = moment(str, format, true);
      if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD HH:mm:ss');
      }
    }

    // 最后尝试 moment 的自动解析
    const autoParsed = moment(str);
    if (autoParsed.isValid()) {
      return autoParsed.format('YYYY-MM-DD HH:mm:ss');
    }

    logger.warn(`无法解析日期: ${str}`);
    return null;
  }

  /**
   * 上传并导入数据文件
   */
  async importFile(req, res) {
    const startTime = Date.now();
    let batchId = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        });
      }

      const filePath = req.file.path;
      const filename = req.file.originalname;
      const fileSize = req.file.size;
      const fileExt = filename.split('.').pop().toLowerCase();
      
      logger.info(`开始导入文件: ${filename}, 大小: ${fileSize} 字节`);
      
      // 解析文件数据
      let data = [];
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        data = await this.parseExcel(filePath);
      } else if (fileExt === 'csv') {
        data = await this.parseCSV(filePath);
      } else {
        return res.status(400).json({
          success: false,
          message: '不支持的文件格式，仅支持 .xlsx, .xls, .csv'
        });
      }

      // 删除临时文件
      fs.unlinkSync(filePath);

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: '文件中没有数据'
        });
      }

      // 生成批次ID
      batchId = uuidv4();
      
      // 创建导入历史记录
      await db.query(
        `INSERT INTO import_history (batch_id, filename, file_size, total_rows, success_rows, import_status, created_by) 
         VALUES (?, ?, ?, ?, 0, 'processing', ?)`,
        [batchId, filename, fileSize, data.length, req.user?.username || 'system']
      );

      // 处理数据
      const result = await this.processData(data, batchId);
      
      // 更新导入历史
      await db.query(
        `UPDATE import_history 
         SET success_rows = ?, failed_rows = ?, new_users = ?, existing_users = ?, 
             total_points = ?, import_status = ?, completed_at = NOW() 
         WHERE batch_id = ?`,
        [
          result.successRows,
          result.failedRows,
          result.newUsers,
          result.existingUsers,
          result.totalPoints,
          'completed',
          batchId
        ]
      );

      const executionTime = Date.now() - startTime;
      logger.info(`文件导入完成: ${filename}, 耗时: ${executionTime}ms, 成功: ${result.successRows}/${data.length}`);

      res.json({
        success: true,
        message: '导入成功',
        data: {
          batchId,
          filename,
          totalRows: data.length,
          successRows: result.successRows,
          failedRows: result.failedRows,
          newUsers: result.newUsers,
          existingUsers: result.existingUsers,
          totalPoints: result.totalPoints,
          executionTime: `${executionTime}ms`
        }
      });

    } catch (error) {
      logger.error('导入失败:', error);
      
      // 更新导入历史为失败状态
      if (batchId) {
        await db.query(
          `UPDATE import_history SET import_status = 'failed', error_message = ? WHERE batch_id = ?`,
          [error.message, batchId]
        );
      }
      
      res.status(500).json({
        success: false,
        message: '导入失败: ' + error.message
      });
    }
  }

  /**
   * 解析Excel文件（优化版本，支持大文件）
   * 对于大文件，使用流式读取
   */
  async parseExcel(filePath, options = {}) {
    const { maxRows = IMPORT_CONFIG.MAX_ROWS } = options;
    
    try {
      // 获取文件大小
      const stats = fs.statSync(filePath);
      const isLargeFile = stats.size > 10 * 1024 * 1024; // 大于10MB视为大文件
      
      if (isLargeFile) {
        logger.info(`检测到大文件 (${(stats.size / 1024 / 1024).toFixed(2)}MB)，使用优化模式读取`);
      }
      
      // 使用流式读取选项
      const workbook = xlsx.readFile(filePath, {
        // 对于大文件，只读取需要的数据
        sheetRows: maxRows + 1, // +1 for header
        // 不解析公式，提高性能
        cellFormula: false,
        // 不解析样式，提高性能
        cellStyles: false,
        // 不解析HTML，提高性能
        cellHTML: false
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (data.length > maxRows) {
        logger.warn(`文件行数 (${data.length}) 超过限制 (${maxRows})，将只处理前 ${maxRows} 行`);
        return data.slice(0, maxRows);
      }
      
      return data;
    } catch (error) {
      logger.error('解析Excel失败:', error);
      throw new Error('Excel文件解析失败: ' + error.message);
    }
  }

  /**
   * 解析CSV文件（流式处理版本）
   * 返回一个可读流，而不是一次性加载所有数据
   */
  parseCSVStream(filePath) {
    return fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv());
  }

  /**
   * 解析CSV文件（传统方式，用于小文件）
   */
  async parseCSV(filePath, options = {}) {
    const { maxRows = IMPORT_CONFIG.MAX_ROWS } = options;
    
    return new Promise((resolve, reject) => {
      const results = [];
      let rowCount = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          if (rowCount < maxRows) {
            results.push(data);
            rowCount++;
          }
        })
        .on('end', () => {
          if (rowCount >= maxRows) {
            logger.warn(`CSV文件行数超过限制 (${maxRows})，已截断`);
          }
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('解析CSV失败:', error);
          reject(new Error('CSV文件解析失败: ' + error.message));
        });
    });
  }

  /**
   * 流式导入大文件（CSV专用）
   * 使用流式处理，分批写入数据库，避免内存溢出
   */
  async importFileStreaming(req, res) {
    const startTime = Date.now();
    let batchId = null;
    let filePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        });
      }

      filePath = req.file.path;
      const filename = req.file.originalname;
      const fileSize = req.file.size;
      const fileExt = filename.split('.').pop().toLowerCase();
      
      // 验证文件大小
      if (fileSize > IMPORT_CONFIG.MAX_FILE_SIZE) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: `文件大小超过限制 (最大 ${IMPORT_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`
        });
      }
      
      // 流式处理仅支持CSV
      if (fileExt !== 'csv') {
        // 对于Excel文件，使用传统方式但带有优化
        return this.importFile(req, res);
      }
      
      logger.info(`开始流式导入文件: ${filename}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      
      // 生成批次ID
      batchId = uuidv4();
      
      // 初始化进度
      this.importProgress.set(batchId, {
        status: 'processing',
        totalRows: 0,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        startTime
      });
      
      // 创建导入历史记录（状态为处理中）
      await db.query(
        `INSERT INTO import_history (batch_id, filename, file_size, total_rows, success_rows, import_status, created_by)
         VALUES (?, ?, ?, 0, 0, 'processing', ?)`,
        [batchId, filename, fileSize, req.user?.username || 'system']
      );
      
      // 立即返回响应，让客户端可以轮询进度
      res.json({
        success: true,
        message: '文件已开始处理',
        data: {
          batchId,
          filename,
          fileSize,
          status: 'processing'
        }
      });
      
      // 异步处理文件
      this.processCSVStreaming(filePath, batchId, filename)
        .catch(error => {
          logger.error('流式导入失败:', error);
          this.updateImportStatus(batchId, 'failed', error.message);
        });
      
    } catch (error) {
      logger.error('流式导入初始化失败:', error);
      
      // 清理临时文件
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '导入失败: ' + error.message
        });
      }
    }
  }

  /**
   * 流式处理CSV文件
   */
  async processCSVStreaming(filePath, batchId, filename) {
    const startTime = Date.now();
    let totalRows = 0;
    let successRows = 0;
    let failedRows = 0;
    let newUsersCount = 0;
    let existingUsersCount = 0;
    let totalPointsAdded = 0;
    
    // 批处理缓冲区
    let batch = [];
    
    try {
      // 获取所有激活的积分规则
      const rules = await db.query(
        'SELECT * FROM point_rules WHERE is_active = true ORDER BY priority DESC, id ASC'
      );
      
      // 获取所有已存在的用户ID
      const existingUsers = await db.query('SELECT user_id FROM users');
      const existingUserIds = new Set(existingUsers.map(u => String(u.user_id)));
      
      // 记录本批次已处理的用户ID
      const processedUserIds = new Set();
      
      // 创建处理流
      const processStream = new Transform({
        objectMode: true,
        transform: async (row, encoding, callback) => {
          totalRows++;
          batch.push(row);
          
          // 更新进度
          if (totalRows % IMPORT_CONFIG.PROGRESS_INTERVAL === 0) {
            this.updateProgress(batchId, {
              totalRows,
              processedRows: successRows + failedRows,
              successRows,
              failedRows
            });
          }
          
          // 当批次达到指定大小时，处理批次
          if (batch.length >= IMPORT_CONFIG.BATCH_SIZE) {
            try {
              const result = await this.processBatch(
                batch,
                batchId,
                rules,
                existingUserIds,
                processedUserIds
              );
              
              successRows += result.successRows;
              failedRows += result.failedRows;
              newUsersCount += result.newUsers;
              existingUsersCount += result.existingUsers;
              totalPointsAdded += result.totalPoints;
              
              batch = [];
            } catch (error) {
              logger.error('批次处理失败:', error);
              failedRows += batch.length;
              batch = [];
            }
          }
          
          callback();
        },
        flush: async (callback) => {
          // 处理剩余的数据
          if (batch.length > 0) {
            try {
              const result = await this.processBatch(
                batch,
                batchId,
                rules,
                existingUserIds,
                processedUserIds
              );
              
              successRows += result.successRows;
              failedRows += result.failedRows;
              newUsersCount += result.newUsers;
              existingUsersCount += result.existingUsers;
              totalPointsAdded += result.totalPoints;
            } catch (error) {
              logger.error('最后批次处理失败:', error);
              failedRows += batch.length;
            }
          }
          callback();
        }
      });
      
      // 执行流式处理
      await pipelineAsync(
        fs.createReadStream(filePath),
        csv(),
        processStream
      );
      
      // 删除临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // 更新导入历史
      const executionTime = Date.now() - startTime;
      await db.query(
        `UPDATE import_history
         SET total_rows = ?, success_rows = ?, failed_rows = ?, new_users = ?,
             existing_users = ?, total_points = ?, import_status = ?, completed_at = NOW()
         WHERE batch_id = ?`,
        [totalRows, successRows, failedRows, newUsersCount, existingUsersCount, totalPointsAdded, 'completed', batchId]
      );
      
      // 更新最终进度
      this.updateProgress(batchId, {
        status: 'completed',
        totalRows,
        processedRows: totalRows,
        successRows,
        failedRows,
        executionTime
      });
      
      logger.info(`流式导入完成: ${filename}, 耗时: ${executionTime}ms, 成功: ${successRows}/${totalRows}`);
      
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await this.updateImportStatus(batchId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * 处理一批数据
   */
  async processBatch(batch, batchId, rules, existingUserIds, processedUserIds) {
    let newUsersCount = 0;
    let existingUsersCount = 0;
    let totalPointsAdded = 0;
    let successRows = 0;
    let failedRows = 0;
    
    await db.transaction(async (connection) => {
      for (const row of batch) {
        try {
          const result = await this.processRow(
            row,
            batchId,
            rules,
            existingUserIds,
            processedUserIds,
            connection
          );
          
          if (result.success) {
            successRows++;
            newUsersCount += result.isNewUser ? 1 : 0;
            existingUsersCount += result.isNewUser ? 0 : 1;
            totalPointsAdded += result.points;
          } else {
            failedRows++;
          }
        } catch (error) {
          logger.error('处理行失败:', error);
          failedRows++;
        }
      }
    });
    
    return {
      successRows,
      failedRows,
      newUsers: newUsersCount,
      existingUsers: existingUsersCount,
      totalPoints: totalPointsAdded
    };
  }

  /**
   * 处理单行数据
   */
  async processRow(row, batchId, rules, existingUserIds, processedUserIds, connection) {
    // 获取用户ID
    const userIdRaw = this.getRowValue(row, ['用户ID', 'user_id', 'userid', 'UserID', '用户编号', '会员ID', '用户id']);
    const userId = userIdRaw !== undefined && userIdRaw !== null ? String(userIdRaw).replace(/\s+/g, '').trim() : '';
    
    if (!userId) {
      return { success: false, reason: '缺少用户ID' };
    }

    // 检查本批次是否已处理过该用户
    if (processedUserIds.has(userId)) {
      return { success: false, reason: '重复用户' };
    }
    processedUserIds.add(userId);

    // 判断是否是新用户
    const isNewUser = !existingUserIds.has(userId);
    
    if (isNewUser) {
      // 创建新用户
      await connection.execute(
        `INSERT INTO users (user_id, username, password_hash, is_new_user, first_import_date, last_active_date)
         VALUES (?, ?, ?, true, NOW(), NOW())`,
        [
          userId,
          (this.getRowValue(row, ['用户昵称', 'username', '昵称', '用户名称', 'name']) || '').toString().trim(),
          DEFAULT_PASSWORD_HASH
        ]
      );
      existingUserIds.add(userId);
    } else {
      // 更新老用户活跃时间
      await connection.execute(
        'UPDATE users SET last_active_date = NOW(), is_new_user = false WHERE user_id = ?',
        [userId]
      );
    }

    // 获取用户当前积分余额
    const [userBefore] = await connection.execute(
      'SELECT available_points FROM users WHERE user_id = ?',
      [userId]
    );
    let currentBalance = userBefore[0]?.available_points || 0;
    
    // 根据规则计算积分
    let userPoints = 0;
    const appliedRuleIds = new Set();
    
    for (const rule of rules) {
      // 处理列名
      let columnKeys = [];
      if (rule.column_name) {
        try {
          const parsed = JSON.parse(rule.column_name);
          columnKeys = Array.isArray(parsed) ? parsed : [rule.column_name];
        } catch {
          columnKeys = String(rule.column_name).split(/[,|]/).map(key => key.trim()).filter(Boolean);
        }
      }
      
      const columnValueRaw = this.getRowValue(row, columnKeys.length ? columnKeys : rule.column_name);
      const columnValue = typeof columnValueRaw === "string" ? columnValueRaw.trim() : columnValueRaw;
      
      if (columnValue === undefined || columnValue === null || columnValue === '') {
        continue;
      }

      let matched = false;
      
      try {
        matched = this.evaluateRule(rule, columnValue);
      } catch (error) {
        continue;
      }

      if (matched && !appliedRuleIds.has(rule.id)) {
        appliedRuleIds.add(rule.id);
        userPoints += rule.points;
        currentBalance += rule.points;
        
        const description = `${rule.rule_name} - ${rule.column_name}:${columnValue}`;
        const watchDateRaw = this.getRowValue(row, ['首次观看直播时间', '观看日期', '直播日期', '观看时间', 'watch_date', 'first_watch_time']);
        const watchDate = this.parseDateToMySQL(watchDateRaw);
        const baseDate = watchDate ? moment(watchDate) : moment();
        const expireDate = rule.validity_days
          ? baseDate.add(rule.validity_days, 'days').format('YYYY-MM-DD')
          : null;

        let insertSql;
        let insertParams;
        
        if (watchDate) {
          insertSql = `INSERT INTO point_records
           (user_id, points, balance_after, source, rule_id, expire_date, import_batch, description, created_at)
           VALUES (?, ?, ?, 'import', ?, ?, ?, ?, ?)`;
          insertParams = [userId, rule.points, currentBalance, rule.id, expireDate, batchId, description, watchDate];
        } else {
          insertSql = `INSERT INTO point_records
           (user_id, points, balance_after, source, rule_id, expire_date, import_batch, description)
           VALUES (?, ?, ?, 'import', ?, ?, ?, ?)`;
          insertParams = [userId, rule.points, currentBalance, rule.id, expireDate, batchId, description];
        }
        
        await connection.execute(insertSql, insertParams);
      }
    }

    return {
      success: true,
      isNewUser,
      points: userPoints
    };
  }

  /**
   * 评估规则是否匹配
   */
  evaluateRule(rule, columnValue) {
    switch (rule.condition_type) {
      case 'equals':
        return String(columnValue).trim() === String(rule.condition_value).trim();
        
      case 'not_equals':
        return String(columnValue).trim() !== String(rule.condition_value).trim();
        
      case 'greater_than':
        return this.parseTimeToMinutes(columnValue) > this.parseTimeToMinutes(rule.condition_value);
        
      case 'greater_or_equal':
        return this.parseTimeToMinutes(columnValue) >= this.parseTimeToMinutes(rule.condition_value);
        
      case 'less_than':
        return this.parseTimeToMinutes(columnValue) < this.parseTimeToMinutes(rule.condition_value);
        
      case 'less_or_equal':
        return this.parseTimeToMinutes(columnValue) <= this.parseTimeToMinutes(rule.condition_value);
        
      case 'contains':
        return String(columnValue).includes(String(rule.condition_value));
        
      case 'range':
        const [min, max] = rule.condition_value.split(',').map(v => this.parseTimeToMinutes(v.trim()));
        const numValue = this.parseTimeToMinutes(columnValue);
        return numValue >= min && numValue <= max;
        
      default:
        return false;
    }
  }

  /**
   * 更新导入进度
   */
  updateProgress(batchId, progress) {
    const current = this.importProgress.get(batchId) || {};
    this.importProgress.set(batchId, { ...current, ...progress });
  }

  /**
   * 更新导入状态
   */
  async updateImportStatus(batchId, status, errorMessage = null) {
    this.updateProgress(batchId, { status, error: errorMessage });
    
    await db.query(
      `UPDATE import_history SET import_status = ?, error_message = ? WHERE batch_id = ?`,
      [status, errorMessage, batchId]
    );
  }

  /**
   * 获取导入进度
   */
  async getImportProgress(req, res) {
    try {
      const { batchId } = req.params;
      
      // 先从内存中获取进度
      const progress = this.importProgress.get(batchId);
      
      if (progress) {
        return res.json({
          success: true,
          data: progress
        });
      }
      
      // 如果内存中没有，从数据库获取
      const [record] = await db.query(
        'SELECT * FROM import_history WHERE batch_id = ?',
        [batchId]
      );
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '导入记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: {
          status: record.import_status,
          totalRows: record.total_rows,
          processedRows: record.success_rows + record.failed_rows,
          successRows: record.success_rows,
          failedRows: record.failed_rows
        }
      });
    } catch (error) {
      logger.error('获取导入进度失败:', error);
      res.status(500).json({
        success: false,
        message: '获取导入进度失败'
      });
    }
  }

  /**
   * 处理导入数据
   */
  async processData(data, batchId) {
    let newUsersCount = 0;
    let existingUsersCount = 0;
    let totalPointsAdded = 0;
    let successRows = 0;
    let failedRows = 0;

    // 获取所有激活的积分规则（按优先级排序）
    const rules = await db.query(
      'SELECT * FROM point_rules WHERE is_active = true ORDER BY priority DESC, id ASC'
    );

    if (rules.length === 0) {
      logger.warn('没有配置积分规则');
    }

    // 获取所有已存在的用户ID
    const existingUsers = await db.query('SELECT user_id FROM users');
    const existingUserIds = new Set(existingUsers.map(u => String(u.user_id)));

    // 记录本批次已处理的用户ID，防止同一文件中重复处理同一用户
    const processedUserIds = new Set();

    // 使用事务处理数据
    await db.transaction(async (connection) => {
      for (const row of data) {
        try {
          // 获取用户ID，支持原始字段名和英文字段
          const userIdRaw = this.getRowValue(row, ['用户ID', 'user_id', 'userid', 'UserID', '用户编号', '会员ID', '用户id']);
          const userId = userIdRaw !== undefined && userIdRaw !== null ? String(userIdRaw).replace(/\s+/g, '').trim() : '';
          
          if (!userId) {
            logger.warn('数据行缺少用户ID，跳过', {
              row: JSON.stringify(row),
              rawValue: userIdRaw
            });
            failedRows++;
            continue;
          }

          // 检查本批次是否已处理过该用户
          if (processedUserIds.has(userId)) {
            logger.warn(`跳过重复用户: ${userId} (同一文件中重复)`);
            failedRows++;
            continue;
          }
          processedUserIds.add(userId);

          // 判断是否是新用户
          const isNewUser = !existingUserIds.has(userId);
          
          if (isNewUser) {
            // 创建新用户
            await connection.execute(
              `INSERT INTO users (user_id, username, password_hash, is_new_user, first_import_date, last_active_date) 
               VALUES (?, ?, ?, true, NOW(), NOW())`,
              [
                userId,
                (this.getRowValue(row, ['用户昵称', 'username', '昵称', '用户名称', 'name']) || '').toString().trim(),
                DEFAULT_PASSWORD_HASH
              ]
            );
            existingUserIds.add(userId);
            newUsersCount++;
          } else {
            // 更新老用户活跃时间，并标记为老用户
            await connection.execute(
              'UPDATE users SET last_active_date = NOW(), is_new_user = false WHERE user_id = ?',
              [userId]
            );
            existingUsersCount++;
          }

          // 获取用户当前积分余额
          const [userBefore] = await connection.execute(
            'SELECT available_points FROM users WHERE user_id = ?',
            [userId]
          );
          let currentBalance = userBefore[0]?.available_points || 0;
          
          // 根据规则计算积分
          let userPoints = 0;
          const appliedRules = [];
          const appliedRuleIds = new Set(); // 记录本次已应用的规则ID
          
          for (const rule of rules) {
            // 处理列名：可能是字符串、数组字符串（如'["直播观看时长"]'）或普通字符串
            let columnKeys = [];
            if (rule.column_name) {
              try {
                // 尝试解析JSON数组格式
                const parsed = JSON.parse(rule.column_name);
                columnKeys = Array.isArray(parsed) ? parsed : [rule.column_name];
              } catch {
                // 不是JSON，按逗号或竖线分割
                columnKeys = String(rule.column_name).split(/[,|]/).map(key => key.trim()).filter(Boolean);
              }
            }
            
            const columnValueRaw = this.getRowValue(row, columnKeys.length ? columnKeys : rule.column_name);
            const columnValue = typeof columnValueRaw === "string" ? columnValueRaw.trim() : columnValueRaw;
            
            // 调试日志
            logger.debug(`规则 ${rule.id} (${rule.rule_name}): 列名=${JSON.stringify(columnKeys)}, 原始值=${columnValueRaw}, 处理后值=${columnValue}`);
            
            // 如果列不存在，跳过该规则
            if (columnValue === undefined || columnValue === null || columnValue === '') {
              continue;
            }

            let matched = false;
            
            try {
              switch (rule.condition_type) {
                case 'equals':
                  matched = String(columnValue).trim() === String(rule.condition_value).trim();
                  break;
                  
                case 'not_equals':
                  matched = String(columnValue).trim() !== String(rule.condition_value).trim();
                  break;
                  
                case 'greater_than':
                  const gtValueMinutes = this.parseTimeToMinutes(columnValue);
                  const gtConditionMinutes = this.parseTimeToMinutes(rule.condition_value);
                  matched = gtValueMinutes > gtConditionMinutes;
                  logger.debug(`规则 ${rule.id} greater_than: ${gtValueMinutes} > ${gtConditionMinutes} = ${matched}`);
                  break;
                  
                case 'greater_or_equal':
                  const geValueMinutes = this.parseTimeToMinutes(columnValue);
                  const geConditionMinutes = this.parseTimeToMinutes(rule.condition_value);
                  matched = geValueMinutes >= geConditionMinutes;
                  logger.info(`规则 ${rule.id} (${rule.rule_name}) greater_or_equal: 列值="${columnValue}" (${geValueMinutes}分钟) >= 条件值="${rule.condition_value}" (${geConditionMinutes}分钟) = ${matched}`);
                  break;
                  
                case 'less_than':
                  const ltValueMinutes = this.parseTimeToMinutes(columnValue);
                  const ltConditionMinutes = this.parseTimeToMinutes(rule.condition_value);
                  matched = ltValueMinutes < ltConditionMinutes;
                  logger.debug(`规则 ${rule.id} less_than: ${ltValueMinutes} < ${ltConditionMinutes} = ${matched}`);
                  break;
                  
                case 'less_or_equal':
                  const leValueMinutes = this.parseTimeToMinutes(columnValue);
                  const leConditionMinutes = this.parseTimeToMinutes(rule.condition_value);
                  matched = leValueMinutes <= leConditionMinutes;
                  logger.debug(`规则 ${rule.id} less_or_equal: ${leValueMinutes} <= ${leConditionMinutes} = ${matched}`);
                  break;
                  
                case 'contains':
                  matched = String(columnValue).includes(String(rule.condition_value));
                  break;
                  
                case 'range':
                  const [min, max] = rule.condition_value.split(',').map(v => this.parseTimeToMinutes(v.trim()));
                  const numValue = this.parseTimeToMinutes(columnValue);
                  matched = numValue >= min && numValue <= max;
                  logger.debug(`规则 ${rule.id} range: ${numValue} in [${min}, ${max}] = ${matched}`);
                  break;
                  
                default:
                  logger.warn(`未知的条件类型: ${rule.condition_type}`);
              }
            } catch (error) {
              logger.error(`规则匹配错误 (规则ID: ${rule.id}):`, error.message);
              continue;
            }

            if (matched) {
              logger.info(`✓ 规则匹配成功！用户 ${userId}, 规则 ${rule.id} (${rule.rule_name}), 将获得 ${rule.points} 积分`);
              
              // 检查本次处理中是否已经应用过此规则（防止同一文件中重复行）
              if (appliedRuleIds.has(rule.id)) {
                logger.warn(`跳过重复规则（同用户同批次）: 用户 ${userId}, 规则 ${rule.id}`);
                continue;
              }
              
              appliedRuleIds.add(rule.id);
              userPoints += rule.points;
              currentBalance += rule.points; // 实时更新余额
              appliedRules.push(rule);
              logger.info(`累计积分: 用户 ${userId} 当前累计 ${userPoints} 积分`);
              
              const description = `${rule.rule_name} - ${rule.column_name}:${columnValue}`;
              
              // 获取直播观看日期（首次观看直播时间）
              const watchDateRaw = this.getRowValue(row, ['首次观看直播时间', '观看日期', '直播日期', '观看时间', 'watch_date', 'first_watch_time']);
              const watchDate = this.parseDateToMySQL(watchDateRaw);
              
              // 计算过期日期（基于观看日期或当前日期）
              const baseDate = watchDate ? moment(watchDate) : moment();
              const expireDate = rule.validity_days
                ? baseDate.add(rule.validity_days, 'days').format('YYYY-MM-DD')
                : null;

              // 记录积分变动（使用实时计算的余额，created_at 使用观看日期）
              let insertSql;
              let insertParams;
              
              if (watchDate) {
                // 如果有观看日期，使用观看日期作为 created_at
                insertSql = `INSERT INTO point_records
                 (user_id, points, balance_after, source, rule_id, expire_date, import_batch, description, created_at)
                 VALUES (?, ?, ?, 'import', ?, ?, ?, ?, ?)`;
                insertParams = [
                  userId,
                  rule.points,
                  currentBalance,
                  rule.id,
                  expireDate,
                  batchId,
                  description,
                  watchDate
                ];
              } else {
                // 如果没有观看日期，使用默认的当前时间
                insertSql = `INSERT INTO point_records
                 (user_id, points, balance_after, source, rule_id, expire_date, import_batch, description)
                 VALUES (?, ?, ?, 'import', ?, ?, ?, ?)`;
                insertParams = [
                  userId,
                  rule.points,
                  currentBalance,
                  rule.id,
                  expireDate,
                  batchId,
                  description
                ];
              }
              
              const insertResult = await connection.execute(insertSql, insertParams);
              logger.info(`✓ 积分记录已保存: 记录ID=${insertResult[0].insertId}, 用户=${userId}, 积分=${rule.points}, 余额=${currentBalance}, 观看日期=${watchDate || '使用导入时间'}`);
            }
          }

          // 更新用户总积分
          if (userPoints > 0) {
            logger.info('用户 ' + userId + ' 匹配成功 ' + appliedRules.length + ' 条规则, 已写入积分累计 ' + userPoints + ' 分, 用户积分将由数据库触发器同步更新');
            totalPointsAdded += userPoints;
          } else {
            logger.debug('用户 ' + userId + ' 未匹配任何规则, 积分为0');
          }
          successRows++;

        } catch (error) {
          logger.error(`处理数据行失败:`, error);
          failedRows++;
        }
      }
    });

    return {
      successRows,
      failedRows,
      newUsers: newUsersCount,
      existingUsers: existingUsersCount,
      totalPoints: totalPointsAdded
    };
  }

  /**
   * 获取导入历史
   */
  async getImportHistory(req, res) {
    try {
      const { page = 1, pageSize = 20, status } = req.query;
      
      let sql = 'SELECT * FROM import_history';
      const params = [];
      
      if (status) {
        sql += ' WHERE import_status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY import_date DESC';
      
      const result = await db.paginate(sql, params, parseInt(page), parseInt(pageSize));
      
      res.json({
        success: true,
        data: {
          list: result.data,
          total: result.pagination.total
        }
      });
    } catch (error) {
      logger.error('获取导入历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取导入历史失败'
      });
    }
  }

  /**
   * 获取导入详情
   */
  async getImportDetail(req, res) {
    try {
      const { batchId } = req.params;
      
      // 获取导入记录
      const [importRecord] = await db.query(
        'SELECT * FROM import_history WHERE batch_id = ?',
        [batchId]
      );
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: '导入记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: importRecord
      });
    } catch (error) {
      logger.error('获取导入详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取导入详情失败'
      });
    }
  }

  /**
   * 下载导入模板
   */
  async downloadTemplate(req, res) {
    try {
      // 创建模板数据
      const templateData = [
        {
          '用户ID': 'USER001',
          '用户名': '张三',
          '观看时长': 45,
          '互动次数': 8,
          '完成度': 100,
          '是否首次': '是'
        },
        {
          '用户ID': 'USER002',
          '用户名': '李四',
          '观看时长': 25,
          '互动次数': 3,
          '完成度': 60,
          '是否首次': '否'
        }
      ];
      
      // 创建工作簿
      const ws = xlsx.utils.json_to_sheet(templateData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, '直播数据');
      
      // 生成Buffer
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=import_template.xlsx');
      
      res.send(buffer);
    } catch (error) {
      logger.error('下载模板失败:', error);
      res.status(500).json({
        success: false,
        message: '下载模板失败'
      });
    }
  }

  /**
   * 清空导入历史
   */
  async clearHistory(req, res) {
    try {
      await db.query('DELETE FROM import_history');
      logger.info('导入历史已清空');
      
      res.json({
        success: true,
        message: '导入历史已清空'
      });
    } catch (error) {
      logger.error('清空导入历史失败:', error);
      res.status(500).json({
        success: false,
        message: '清空导入历史失败'
      });
    }
  }
}

module.exports = new ImportController();







