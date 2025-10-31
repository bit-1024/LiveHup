const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../config/database');
const logger = require('../config/logger');

class ImportController {
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
   * 解析Excel文件
   */
  async parseExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
      return data;
    } catch (error) {
      logger.error('解析Excel失败:', error);
      throw new Error('Excel文件解析失败');
    }
  }

  /**
   * 解析CSV文件
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => {
          logger.error('解析CSV失败:', error);
          reject(new Error('CSV文件解析失败'));
        });
    });
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
    const existingUserIds = new Set(existingUsers.map(u => u.user_id));

    // 使用事务处理数据
    await db.transaction(async (connection) => {
      for (const row of data) {
        try {
          // 获取用户ID（支持多种列名）
          const userId = row['用户ID'] || row['user_id'] || row['userId'] || row['UserID'];
          
          if (!userId) {
            logger.warn('数据行缺少用户ID，跳过');
            failedRows++;
            continue;
          }

          // 判断是否是新用户
          const isNewUser = !existingUserIds.has(String(userId));
          
          if (isNewUser) {
            // 创建新用户
            await connection.execute(
              `INSERT INTO users (user_id, username, is_new_user, first_import_date, last_active_date) 
               VALUES (?, ?, true, NOW(), NOW())`,
              [
                userId,
                row['用户名'] || row['username'] || row['姓名'] || row['name'] || ''
              ]
            );
            existingUserIds.add(String(userId));
            newUsersCount++;
          } else {
            // 更新老用户活跃时间
            await connection.execute(
              'UPDATE users SET last_active_date = NOW() WHERE user_id = ?',
              [userId]
            );
            existingUsersCount++;
          }

          // 根据规则计算积分
          let userPoints = 0;
          const appliedRules = [];
          
          for (const rule of rules) {
            const columnValue = row[rule.column_name];
            
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
                  matched = Number(columnValue) > Number(rule.condition_value);
                  break;
                  
                case 'greater_or_equal':
                  matched = Number(columnValue) >= Number(rule.condition_value);
                  break;
                  
                case 'less_than':
                  matched = Number(columnValue) < Number(rule.condition_value);
                  break;
                  
                case 'less_or_equal':
                  matched = Number(columnValue) <= Number(rule.condition_value);
                  break;
                  
                case 'contains':
                  matched = String(columnValue).includes(String(rule.condition_value));
                  break;
                  
                case 'range':
                  const [min, max] = rule.condition_value.split(',').map(v => Number(v.trim()));
                  const numValue = Number(columnValue);
                  matched = numValue >= min && numValue <= max;
                  break;
                  
                default:
                  logger.warn(`未知的条件类型: ${rule.condition_type}`);
              }
            } catch (error) {
              logger.error(`规则匹配错误 (规则ID: ${rule.id}):`, error.message);
              continue;
            }

            if (matched) {
              userPoints += rule.points;
              appliedRules.push(rule);
              
              // 计算过期日期
              const expireDate = rule.validity_days 
                ? moment().add(rule.validity_days, 'days').format('YYYY-MM-DD')
                : null;

              // 获取当前用户积分余额
              const [userResult] = await connection.execute(
                'SELECT available_points FROM users WHERE user_id = ?',
                [userId]
              );
              const balanceAfter = (userResult[0]?.available_points || 0) + rule.points;

              // 记录积分变动
              await connection.execute(
                `INSERT INTO point_records 
                 (user_id, points, balance_after, source, rule_id, expire_date, import_batch, description) 
                 VALUES (?, ?, ?, 'import', ?, ?, ?, ?)`,
                [
                  userId,
                  rule.points,
                  balanceAfter,
                  rule.id,
                  expireDate,
                  batchId,
                  `${rule.rule_name} - ${rule.column_name}:${columnValue}`
                ]
              );
            }
          }

          // 更新用户总积分
          if (userPoints > 0) {
            await connection.execute(
              `UPDATE users 
               SET total_points = total_points + ?, 
                   available_points = available_points + ? 
               WHERE user_id = ?`,
              [userPoints, userPoints, userId]
            );
            totalPointsAdded += userPoints;
            
            logger.debug(`用户 ${userId} 获得 ${userPoints} 积分，应用了 ${appliedRules.length} 条规则`);
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
        data: result.data,
        pagination: result.pagination
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
      
      // 获取该批次的积分记录
      const pointRecords = await db.query(
        `SELECT pr.*, u.username 
         FROM point_records pr
         LEFT JOIN users u ON pr.user_id = u.user_id
         WHERE pr.import_batch = ?
         ORDER BY pr.created_at DESC
         LIMIT 100`,
        [batchId]
      );
      
      res.json({
        success: true,
        data: {
          import: importRecord,
          records: pointRecords
        }
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
}

module.exports = new ImportController();