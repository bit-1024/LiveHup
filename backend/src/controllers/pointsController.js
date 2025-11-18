const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');
const xlsx = require('xlsx');

const ADMIN_ROLES = ['admin', 'super_admin'];
const isAdminUser = (user) => user && ADMIN_ROLES.includes(user.role);

/**
 * 将查询参数转换为布尔值
 */
const parseBooleanQuery = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  return null;
};

/**
 * 构建积分记录查询条件
 */
const buildPointRecordFilterConditions = (filters = {}, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  let conditions = '';
  const params = [];

  if (filters.source) {
    conditions += ` AND ${prefix}source = ?`;
    params.push(filters.source);
  }

  if (filters.import_batch) {
    conditions += ` AND ${prefix}import_batch = ?`;
    params.push(filters.import_batch);
  }

  const expiredFlag = parseBooleanQuery(filters.is_expired);
  if (expiredFlag !== null) {
    conditions += ` AND ${prefix}is_expired = ?`;
    params.push(expiredFlag);
  }

  if (filters.start_date) {
    const startMoment = moment(filters.start_date);
    if (startMoment.isValid()) {
      conditions += ` AND ${prefix}created_at >= ?`;
      params.push(startMoment.startOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
  }

  if (filters.end_date) {
    const endMoment = moment(filters.end_date);
    if (endMoment.isValid()) {
      conditions += ` AND ${prefix}created_at < ?`;
      params.push(endMoment.add(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
  }

  if (filters.expire_start) {
    const expireStart = moment(filters.expire_start);
    if (expireStart.isValid()) {
      conditions += ` AND ${prefix}expire_date >= ?`;
      params.push(expireStart.startOf('day').format('YYYY-MM-DD'));
    }
  }

  if (filters.expire_end) {
    const expireEnd = moment(filters.expire_end);
    if (expireEnd.isValid()) {
      conditions += ` AND ${prefix}expire_date <= ?`;
      params.push(expireEnd.endOf('day').format('YYYY-MM-DD'));
    }
  }

  if (filters.min_points !== undefined && filters.min_points !== null && filters.min_points !== '') {
    const minValue = Number(filters.min_points);
    if (!Number.isNaN(minValue)) {
      conditions += ` AND ${prefix}points >= ?`;
      params.push(minValue);
    }
  }

  if (filters.max_points !== undefined && filters.max_points !== null && filters.max_points !== '') {
    const maxValue = Number(filters.max_points);
    if (!Number.isNaN(maxValue)) {
      conditions += ` AND ${prefix}points <= ?`;
      params.push(maxValue);
    }
  }

  return { conditions, params };
};

class PointsController {
  /**
   * 获取积分记录，管理员可以指定 user_id，普通成员只能查看自己的记录
   */
  async getPointsRecords(req, res) {
    try {
      const {
        user_id,
        page = 1,
        pageSize = 20,
        source,
        start_date,
        end_date,
        is_expired,
        min_points,
        max_points,
        import_batch,
        expire_start,
        expire_end,
      } = req.query;

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      const targetUserId = isAdmin ? user_id : requester.user_id;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空',
        });
      }

      const { conditions, params: filterParams } = buildPointRecordFilterConditions(
        {
          source,
          start_date,
          end_date,
          is_expired,
          min_points,
          max_points,
          import_batch,
          expire_start,
          expire_end,
        },
        'pr'
      );

      const sql = `
        SELECT pr.id, pr.user_id, pr.points, pr.balance_after, pr.source, pr.description, 
               pr.expire_date, pr.is_expired, pr.created_at, pr.import_batch
        FROM point_records pr
        WHERE pr.user_id = ?${conditions}
        ORDER BY pr.created_at DESC
      `;

      const result = await db.paginate(
        sql,
        [targetUserId, ...filterParams],
        parseInt(page, 10),
        parseInt(pageSize, 10)
      );

      res.json({
        success: true,
        data: {
          list: result.data,
          total: result.pagination.total,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('获取积分记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分记录失败',
      });
    }
  }

  /**
   * 获取积分历史记录
   */
  async getPointsHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      const targetUserId = isAdmin ? userId : requester.user_id;

      if (!targetUserId) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求无法查看积分记录',
        });
      }

      if (!isAdmin && targetUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看其他用户的积分记录',
        });
      }

      const sql = `
        SELECT id, user_id, points, balance_after, source, description, 
               expire_date, is_expired, created_at
        FROM point_records
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;

      const result = await db.paginate(sql, [targetUserId], parseInt(page, 10), parseInt(pageSize, 10));

      res.json({
        success: true,
        data: {
          list: result.data,
          total: result.pagination.total,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('获取积分历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分历史失败',
      });
    }
  }

  /**
   * 获取即将过期的积分
   */
  async getExpiringPoints(req, res) {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      const targetUserId = isAdmin ? userId : requester.user_id;

      if (!targetUserId) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求无法查询即将过期的积分',
        });
      }

      if (!isAdmin && targetUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看其他用户的积分信息',
        });
      }

      const expiringPoints = await db.query(
        `SELECT 
           SUM(points) as expiring_points, 
           expire_date,
           DATEDIFF(expire_date, CURDATE()) as days_to_expire
         FROM point_records
         WHERE user_id = ? 
           AND is_expired = false 
           AND expire_date IS NOT NULL
           AND expire_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         GROUP BY expire_date
         ORDER BY expire_date ASC`,
        [targetUserId, parseInt(days, 10)]
      );

      res.json({
        success: true,
        data: expiringPoints,
      });
    } catch (error) {
      logger.error('获取即将过期积分失败:', error);
      res.status(500).json({
        success: false,
        message: '获取即将过期积分失败',
      });
    }
  }

  /**
   * 获取积分统计数据
   */
  async getPointsStats(req, res) {
    try {
      const { userId } = req.params;
      const {
        trend_days = 30,
        recent_limit = 10,
        source,
        start_date,
        end_date,
        is_expired,
        import_batch,
        min_points,
        max_points,
        expire_start,
        expire_end,
      } = req.query;

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      const targetUserId = isAdmin ? userId : requester.user_id;

      if (!targetUserId) {
        return res.status(401).json({
          success: false,
          message: '未认证的请求无法获取积分统计',
        });
      }

      if (!isAdmin && userId && targetUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看其他用户的积分统计',
        });
      }

      const [user] = await db.query(
        `SELECT user_id, username, phone, total_points, available_points, used_points, expired_points,
                first_import_date, last_active_date, created_at
         FROM users WHERE user_id = ?`,
        [targetUserId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      const filterMeta = buildPointRecordFilterConditions(
        {
          source,
          start_date,
          end_date,
          is_expired,
          import_batch,
          min_points,
          max_points,
          expire_start,
          expire_end,
        },
        'pr'
      );

      const baseParams = [targetUserId, ...filterMeta.params];

      const [aggregate] = await db.query(
        `
          SELECT 
            COUNT(*) AS record_count,
            IFNULL(SUM(CASE WHEN pr.points > 0 THEN pr.points ELSE 0 END), 0) AS earned_points,
            IFNULL(SUM(CASE WHEN pr.points < 0 THEN ABS(pr.points) ELSE 0 END), 0) AS spent_points,
            IFNULL(SUM(CASE WHEN pr.is_expired = 1 THEN ABS(pr.points) ELSE 0 END), 0) AS expired_points
          FROM point_records pr
          WHERE pr.user_id = ?${filterMeta.conditions}
        `,
        baseParams
      );

      const sourceDistribution = await db.query(
        `
          SELECT 
            pr.source,
            COUNT(*) AS record_count,
            IFNULL(SUM(CASE WHEN pr.points > 0 THEN pr.points ELSE 0 END), 0) AS earned_points,
            IFNULL(SUM(CASE WHEN pr.points < 0 THEN ABS(pr.points) ELSE 0 END), 0) AS spent_points
          FROM point_records pr
          WHERE pr.user_id = ?${filterMeta.conditions}
          GROUP BY pr.source
          ORDER BY record_count DESC
        `,
        baseParams
      );

      const trendDays = Math.min(Math.max(parseInt(trend_days, 10) || 30, 7), 365);
      const hasCustomRange = Boolean(start_date || end_date);

      let trendSql = `
        SELECT 
          DATE_FORMAT(pr.created_at, '%Y-%m-%d') AS date,
          SUM(pr.points) AS net_points,
          SUM(CASE WHEN pr.points > 0 THEN pr.points ELSE 0 END) AS earned_points,
          SUM(CASE WHEN pr.points < 0 THEN ABS(pr.points) ELSE 0 END) AS spent_points
        FROM point_records pr
        WHERE pr.user_id = ?${filterMeta.conditions}
      `;
      const trendParams = [targetUserId, ...filterMeta.params];

      if (!hasCustomRange) {
        trendSql += ' AND pr.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        trendParams.push(trendDays);
      }

      trendSql += `
        GROUP BY DATE_FORMAT(pr.created_at, '%Y-%m-%d')
        ORDER BY date ASC
      `;

      const trend = await db.query(trendSql, trendParams);

      const recentLimit = Math.min(Math.max(parseInt(recent_limit, 10) || 10, 1), 200);
      const recentRecords = await db.query(
        `
          SELECT 
            pr.id, pr.user_id, pr.points, pr.balance_after, pr.source, pr.description,
            pr.expire_date, pr.is_expired, pr.created_at, pr.import_batch
          FROM point_records pr
          WHERE pr.user_id = ?${filterMeta.conditions}
          ORDER BY pr.created_at DESC
          LIMIT ?
        `,
        [targetUserId, ...filterMeta.params, recentLimit]
      );

      res.json({
        success: true,
        data: {
          user,
          summary: {
            total_records: aggregate?.record_count || 0,
            earned_points: aggregate?.earned_points || 0,
            spent_points: aggregate?.spent_points || 0,
            expired_points: aggregate?.expired_points || 0,
            balance: user.available_points,
            net_points: (aggregate?.earned_points || 0) - (aggregate?.spent_points || 0),
          },
          source_distribution: sourceDistribution,
          trend,
          recent_records: recentRecords,
        },
      });
    } catch (error) {
      logger.error('获取积分统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分统计失败',
      });
    }
  }

  /**
   * 获取积分排行榜（仅管理员）
   */
  async getPointsRanking(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限',
        });
      }

      const { metric = 'available', limit = 20, keyword, min_points } = req.query;

      const metricMap = {
        available: 'available_points',
        total: 'total_points',
        used: 'used_points',
        expired: 'expired_points',
      };
      const sortColumn = metricMap[metric] || metricMap.available;
      const size = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);

      let sql = `
        SELECT 
          user_id,
          username,
          phone,
          total_points,
          available_points,
          used_points,
          expired_points,
          last_active_date
        FROM users
        WHERE 1=1
      `;
      const params = [];

      if (keyword) {
        const likeValue = `%${keyword.trim()}%`;
        sql += ' AND (user_id LIKE ? OR username LIKE ? OR phone LIKE ?)';
        params.push(likeValue, likeValue, likeValue);
      }

      if (min_points !== undefined && min_points !== null && min_points !== '') {
        const threshold = Number(min_points);
        if (!Number.isNaN(threshold)) {
          sql += ` AND ${sortColumn} >= ?`;
          params.push(threshold);
        }
      }

      sql += ` ORDER BY ${sortColumn} DESC, total_points DESC LIMIT ?`;
      params.push(size);

      const ranking = await db.query(sql, params);

      const list = ranking.map((item, index) => ({
        rank: index + 1,
        user_id: item.user_id,
        username: item.username,
        phone: item.phone,
        total_points: item.total_points,
        available_points: item.available_points,
        used_points: item.used_points,
        expired_points: item.expired_points,
        last_active_date: item.last_active_date,
        score: item[sortColumn],
      }));

      res.json({
        success: true,
        data: {
          metric: metricMap[metric] ? metric : 'available',
          list,
        },
      });
    } catch (error) {
      logger.error('获取积分排行榜失败:', error);
      res.status(500).json({
        success: false,
        message: '获取积分排行榜失败',
      });
    }
  }

  /**
   * 导出积分记录（仅管理员）
   */
  async exportPointsRecords(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限才可导出',
        });
      }

      const {
        user_id,
        source,
        start_date,
        end_date,
        is_expired,
        import_batch,
        min_points,
        max_points,
        expire_start,
        expire_end,
        limit = 5000,
      } = req.query;

      const exportLimit = Math.min(Math.max(parseInt(limit, 10) || 5000, 1), 50000);

      const { conditions, params: filterParams } = buildPointRecordFilterConditions(
        {
          source,
          start_date,
          end_date,
          is_expired,
          import_batch,
          min_points,
          max_points,
          expire_start,
          expire_end,
        },
        'pr'
      );

      let sql = `
        SELECT 
          pr.id,
          pr.user_id,
          pr.points,
          pr.balance_after,
          pr.source,
          pr.description,
          pr.expire_date,
          pr.is_expired,
          pr.import_batch,
          pr.created_at
        FROM point_records pr
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        sql += ' AND pr.user_id = ?';
        params.push(user_id);
      }

      sql += `${conditions} ORDER BY pr.created_at DESC LIMIT ?`;
      params.push(...filterParams, exportLimit);

      const records = await db.query(sql, params);

      if (!records || records.length === 0) {
        return res.status(404).json({
          success: false,
          message: '没有符合条件的数据可以导出',
        });
      }

      const sheetData = records.map((record, index) => ({
        序号: index + 1,
        用户ID: record.user_id,
        积分变动: record.points,
        变动后余额: record.balance_after,
        来源: record.source,
        描述: record.description || '',
        到期日期: record.expire_date ? moment(record.expire_date).format('YYYY-MM-DD') : '',
        是否过期: record.is_expired ? '是' : '否',
        导入批次: record.import_batch || '',
        创建时间: moment(record.created_at).format('YYYY-MM-DD HH:mm:ss'),
      }));

      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, '积分记录');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = `points_records_${user_id || 'all'}_${moment().format('YYYYMMDDHHmmss')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      logger.error('导出积分记录失败:', error);
      res.status(500).json({
        success: false,
        message: '导出积分记录失败',
      });
    }
  }
}

module.exports = new PointsController();
