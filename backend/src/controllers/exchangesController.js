const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');
const xlsx = require('xlsx');
const { buildFileUrl } = require('../utils/file');

const ADMIN_ROLES = ['admin', 'super_admin'];
const isAdminUser = (user) => user && ADMIN_ROLES.includes(user.role);

const buildExchangeFilterConditions = (query = {}) => {
  const params = [];
  let conditions = '';

  const rawUserId = query.user_id || query.userId;
  const userName = query.user_name || query.userName;
  if (rawUserId || userName) {
    if (rawUserId && userName) {
      conditions += ' AND (e.user_id = ? OR e.user_id IN (SELECT user_id FROM users WHERE username LIKE ?))';
      params.push(rawUserId, `%${userName}%`);
    } else if (rawUserId) {
      conditions += ' AND e.user_id = ?';
      params.push(rawUserId);
    } else {
      conditions += ' AND e.user_id IN (SELECT user_id FROM users WHERE username LIKE ?)';
      params.push(`%${userName}%`);
    }
  }

  if (query.status) {
    conditions += ' AND e.status = ?';
    params.push(query.status);
  }

  const keyword = (query.keyword || '').trim();
  if (keyword) {
    const likeValue = `%${keyword}%`;
    conditions += ` AND (
      e.exchange_no LIKE ?
      OR e.product_name LIKE ?
      OR e.contact_name LIKE ?
      OR e.contact_phone LIKE ?
      OR e.tracking_number LIKE ?
    )`;
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  const startDateRaw = query.start_date || query.startDate;
  if (startDateRaw) {
    const startMoment = moment(startDateRaw);
    if (startMoment.isValid()) {
      conditions += ' AND e.exchange_date >= ?';
      params.push(startMoment.startOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
  }

  const endDateRaw = query.end_date || query.endDate;
  if (endDateRaw) {
    const endMoment = moment(endDateRaw);
    if (endMoment.isValid()) {
      conditions += ' AND e.exchange_date < ?';
      params.push(endMoment.add(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
  }

  return { conditions, params };
};

class ExchangesController {
  async getExchanges(req, res) {
    try {
      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      if (!isAdmin && !requester.user_id) {
        return res.status(401).json({ success: false, message: '未认证的请求无法查看兑换记录' });
      }

      const { page = 1, pageSize = 20, sort_by = 'exchange_date', sort_order = 'DESC' } = req.query;

      let sql = '\n        SELECT e.*\n        FROM exchanges e\n        WHERE 1=1\n      ';
      const { conditions: filterConditions, params } = buildExchangeFilterConditions(req.query);
      sql += filterConditions;

      if (!isAdmin) {
        sql += ' AND e.user_id = ?';
        params.push(requester.user_id);
      }

      const allowedSortFields = ['exchange_date', 'points_used', 'status'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'exchange_date';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY e.${sortField} ${sortDirection}`;

      const result = await db.paginate(sql, params, parseInt(page, 10), parseInt(pageSize, 10));
      const list = (result.data || []).map((item) => ({
        ...item,
        product_image: buildFileUrl(req, item.product_image),
      }));

      res.json({
        success: true,
        data: {
          list,
          total: result.pagination.total,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('获取兑换列表失败:', error);
      res.status(500).json({ success: false, message: '获取兑换列表失败' });
    }
  }

  async getExchangeDetail(req, res) {
    try {
      const { id } = req.params;
      const [exchange] = await db.query(
        `SELECT e.*, p.name as product_name FROM exchanges e LEFT JOIN products p ON e.product_id = p.id WHERE e.id = ?`,
        [id]
      );

      if (!exchange) {
        return res.status(404).json({ success: false, message: '兑换记录不存在' });
      }

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      if (!isAdmin && exchange.user_id !== requester.user_id) {
        return res.status(403).json({ success: false, message: '无权限查看该兑换记录' });
      }

      res.json({
        success: true,
        data: {
          ...exchange,
          product_image: buildFileUrl(req, exchange.product_image),
        },
      });
    } catch (error) {
      logger.error('获取兑换详情失败:', error);
      res.status(500).json({ success: false, message: '获取兑换详情失败' });
    }
  }

  async getExchangeStats(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
      }

      const { trend_days = 30, top_limit = 5 } = req.query;
      const { conditions, params } = buildExchangeFilterConditions(req.query);
      const baseWhere = `WHERE 1=1 ${conditions}`;
      const baseParams = [...params];
      const trendDays = Math.min(Math.max(parseInt(trend_days, 10) || 30, 1), 365);
      const productLimit = Math.min(Math.max(parseInt(top_limit, 10) || 5, 1), 50);

      const [summary] = await db.query(
        `SELECT COUNT(*) AS total_orders, IFNULL(SUM(e.points_used), 0) AS total_points_used, IFNULL(SUM(e.quantity), 0) AS total_quantity, IFNULL(SUM(CASE WHEN e.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders, IFNULL(SUM(CASE WHEN e.status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed_orders, IFNULL(SUM(CASE WHEN e.status = 'shipped' THEN 1 ELSE 0 END), 0) AS shipped_orders, IFNULL(SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders, IFNULL(SUM(CASE WHEN e.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders FROM exchanges e ${baseWhere}`,
        baseParams
      );

      const statusDistribution = await db.query(
        `SELECT e.status, COUNT(*) AS count FROM exchanges e ${baseWhere} GROUP BY e.status ORDER BY count DESC`,
        baseParams
      );

      const topProducts = await db.query(
        `SELECT e.product_id, e.product_name, IFNULL(SUM(e.quantity), 0) AS total_quantity, IFNULL(SUM(e.points_used), 0) AS total_points FROM exchanges e ${baseWhere} GROUP BY e.product_id, e.product_name ORDER BY total_quantity DESC LIMIT ?`,
        [...baseParams, productLimit]
      );

      const hasCustomRange = Boolean(req.query.start_date || req.query.startDate || req.query.end_date || req.query.endDate);
      let trendWhere = baseWhere;
      const trendParams = [...params];
      if (!hasCustomRange) {
        trendWhere += ' AND e.exchange_date >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        trendParams.push(trendDays);
      }

      const trend = await db.query(
        `SELECT DATE_FORMAT(e.exchange_date, '%Y-%m-%d') AS date, COUNT(*) AS total_orders, IFNULL(SUM(e.points_used), 0) AS total_points, IFNULL(SUM(e.quantity), 0) AS total_quantity FROM exchanges e ${trendWhere} GROUP BY DATE_FORMAT(e.exchange_date, '%Y-%m-%d') ORDER BY date ASC`,
        trendParams
      );

      res.json({
        success: true,
        data: {
          summary: {
            total_orders: summary?.total_orders || 0,
            total_points_used: summary?.total_points_used || 0,
            total_quantity: summary?.total_quantity || 0,
            pending_orders: summary?.pending_orders || 0,
            confirmed_orders: summary?.confirmed_orders || 0,
            shipped_orders: summary?.shipped_orders || 0,
            completed_orders: summary?.completed_orders || 0,
            cancelled_orders: summary?.cancelled_orders || 0,
          },
          status_distribution: statusDistribution,
          top_products: topProducts,
          trend,
        },
      });
    } catch (error) {
      logger.error('获取兑换统计失败:', error);
      res.status(500).json({ success: false, message: '获取兑换统计失败' });
    }
  }

  async exportExchanges(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: '需要管理员权限才能导出' });
      }

      const { limit = 5000 } = req.query;
      const exportLimit = Math.min(Math.max(parseInt(limit, 10) || 5000, 1), 50000);
      const { conditions, params } = buildExchangeFilterConditions(req.query);

      const records = await db.query(
        `SELECT e.* FROM exchanges e WHERE 1=1 ${conditions} ORDER BY e.exchange_date DESC LIMIT ?`,
        [...params, exportLimit]
      );

      if (!records || records.length === 0) {
        return res.status(404).json({ success: false, message: '没有符合条件的数据可导出' });
      }

      const statusMap = {
        pending: '待处理',
        confirmed: '已确认',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消',
      };
      const formatDateTime = (value) => (value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : '');

      const sheetData = records.map((item, index) => ({
        '序号': index + 1,
        '兑换单号': item.exchange_no,
        '用户ID': item.user_id,
        '商品名称': item.product_name,
        '兑换数量': item.quantity,
        '消耗积分': item.points_used,
        '订单状态': statusMap[item.status] || item.status,
        '联系人': item.contact_name || '',
        '联系电话': item.contact_phone || '',
        '收货地址': item.shipping_address || '',
        '物流单号': item.tracking_number || '',
        '备注': item.remark || '',
        '下单时间': formatDateTime(item.exchange_date),
        '确认时间': formatDateTime(item.confirmed_at),
        '发货时间': formatDateTime(item.shipped_at),
        '完成时间': formatDateTime(item.completed_at),
        '取消时间': formatDateTime(item.cancelled_at),
      }));

      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, '兑换记录');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = 'exchanges_' + moment().format('YYYYMMDDHHmmss') + '.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
      res.send(buffer);
    } catch (error) {
      logger.error('导出兑换记录失败:', error);
      res.status(500).json({ success: false, message: '导出兑换记录失败' });
    }
  }

  async createExchange(req, res) {
    try {
      const {
        user_id,
        product_id,
        quantity = 1,
        contact_name,
        contact_phone,
        shipping_address,
        remark,
      } = req.body;

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      const targetUserId = isAdmin && user_id ? user_id : requester.user_id;

      if (!targetUserId || !product_id) {
        return res.status(400).json({ success: false, message: '用户ID或商品ID不能为空' });
      }

      const [user] = await db.query('SELECT user_id, available_points FROM users WHERE user_id = ?', [targetUserId]);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      const [product] = await db.query('SELECT id, name, image_url, points_required, stock, is_active FROM products WHERE id = ?', [product_id]);
      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      if (!product.is_active) {
        return res.status(400).json({ success: false, message: '商品已下架' });
      }

      if (quantity <= 0) {
        return res.status(400).json({ success: false, message: '兑换数量必须大于0' });
      }

      if (product.stock !== -1 && product.stock < quantity) {
        return res.status(400).json({ success: false, message: '库存不足，无法兑换' });
      }

      const totalPoints = product.points_required * quantity;
      if (user.available_points < totalPoints) {
        return res.status(400).json({ success: false, message: '积分不足，无法兑换' });
      }

      const exchangeNo = 'EX' + moment().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000);

      await db.transaction(async (connection) => {
        const [result] = await connection.execute(
          'INSERT INTO exchanges (exchange_no, user_id, product_id, product_name, product_image, points_used, quantity, contact_name, contact_phone, shipping_address, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            exchangeNo,
            targetUserId,
            product_id,
            product.name,
            product.image_url,
            totalPoints,
            quantity,
            contact_name || null,
            contact_phone || null,
            shipping_address || null,
            remark || null,
          ]
        );

        const exchangeId = result.insertId;
        const newBalance = user.available_points - totalPoints;

        await connection.execute(
          'INSERT INTO point_records (user_id, points, balance_after, source, description) VALUES (?, ?, ?, \'exchange\', ?)',
          [
            targetUserId,
            -totalPoints,
            newBalance,
            '兑换商品: ' + product.name + ' x' + quantity + '，订单号: ' + exchangeNo,
          ]
        );

        if (product.stock !== -1) {
          await connection.execute('UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?', [quantity, quantity, product_id]);
        } else {
          await connection.execute('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [quantity, product_id]);
        }

        logger.info('创建兑换订单成功: ' + exchangeNo + '，用户: ' + targetUserId + '，商品: ' + product.name);

        res.json({
          success: true,
          message: '兑换成功',
          data: {
            exchange_id: exchangeId,
            exchange_no: exchangeNo,
            points_used: totalPoints,
          },
        });
      });
    } catch (error) {
      logger.error('创建兑换订单失败:', error);
      res.status(500).json({ success: false, message: '兑换失败，请稍后重试' });
    }
  }

  async updateExchange(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
      }

      const { id } = req.params;
      const { status, tracking_number, remark } = req.body || {};
      const allowedStatuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];

      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: '非法的订单状态' });
      }

      const [exchange] = await db.query('SELECT * FROM exchanges WHERE id = ?', [id]);
      if (!exchange) {
        return res.status(404).json({ success: false, message: '兑换记录不存在' });
      }

      await this.applyExchangeStatusChange(exchange, { status, tracking_number, remark });

      res.json({ success: true, message: '订单状态更新成功' });
    } catch (error) {
      logger.error('更新兑换状态失败:', error);
      res.status(500).json({ success: false, message: '更新状态失败' });
    }
  }

  async batchUpdateStatus(req, res) {
    try {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
      }

      const { ids, status, tracking_number, remark } = req.body || {};
      const allowedStatuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
      const targetIds = Array.isArray(ids) ? [...new Set(ids)].filter(Boolean) : [];

      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: '非法的订单状态' });
      }

      if (targetIds.length === 0) {
        return res.status(400).json({ success: false, message: '请至少选择一条记录' });
      }

      const placeholders = targetIds.map(() => '?').join(',');
      const exchanges = await db.query(`SELECT * FROM exchanges WHERE id IN (${placeholders})`, targetIds);

      if (!exchanges || exchanges.length === 0) {
        return res.status(404).json({ success: false, message: '未找到对应的兑换记录' });
      }

      for (const exchange of exchanges) {
        await this.applyExchangeStatusChange(exchange, { status, tracking_number, remark });
      }

      res.json({ success: true, message: '成功更新' + exchanges.length + '条订单' });
    } catch (error) {
      logger.error('批量更新兑换状态失败:', error);
      res.status(500).json({ success: false, message: '批量更新失败' });
    }
  }

  async cancelExchange(req, res) {
    try {
      const { id } = req.params;
      const { cancel_reason } = req.body || {};

      const [exchange] = await db.query('SELECT * FROM exchanges WHERE id = ?', [id]);
      if (!exchange) {
        return res.status(404).json({ success: false, message: '兑换记录不存在' });
      }

      const requester = req.user || {};
      const isAdmin = isAdminUser(requester);
      if (!isAdmin && exchange.user_id !== requester.user_id) {
        return res.status(403).json({ success: false, message: '无权限取消该订单' });
      }

      if (!['pending', 'confirmed'].includes(exchange.status)) {
        return res.status(400).json({ success: false, message: '当前状态不支持取消' });
      }

      await this.processExchangeCancellation(exchange, cancel_reason || '用户取消');

      res.json({ success: true, message: '订单取消成功，积分已退回' });
    } catch (error) {
      logger.error('取消兑换失败:', error);
      res.status(500).json({ success: false, message: '取消兑换失败' });
    }
  }

  async processExchangeCancellation(exchange, cancelReason = '用户取消') {
    await db.transaction(async (connection) => {
      await connection.execute(
        'UPDATE exchanges SET status = \'cancelled\', cancelled_at = NOW(), cancel_reason = ? WHERE id = ?',
        [cancelReason, exchange.id]
      );

      const [userRows] = await connection.execute('SELECT available_points FROM users WHERE user_id = ?', [exchange.user_id]);
      const user = (userRows && userRows[0]) || { available_points: 0 };
      const newBalance = (user.available_points || 0) + exchange.points_used;

      await connection.execute(
        'INSERT INTO point_records (user_id, points, balance_after, source, description) VALUES (?, ?, ?, \'exchange\', ?)',
        [
          exchange.user_id,
          exchange.points_used,
          newBalance,
          '兑换订单取消退回积分，订单号: ' + exchange.exchange_no,
        ]
      );

      await connection.execute(
        'UPDATE products SET stock = CASE WHEN stock >= 0 THEN stock + ? ELSE stock END, sold_count = sold_count - ? WHERE id = ?',
        [exchange.quantity, exchange.quantity, exchange.product_id]
      );
    });

    logger.info('取消兑换订单: ' + exchange.exchange_no + '，原因: ' + cancelReason);
  }

  async applyExchangeStatusChange(exchange, payload) {
    const { status, tracking_number, remark } = payload;

    if (status === 'cancelled') {
      await this.processExchangeCancellation(exchange, remark || '管理员取消');
      return;
    }

    const updates = ['status = ?'];
    const values = [status];

    if (tracking_number !== undefined) {
      updates.push('tracking_number = ?');
      values.push(tracking_number);
    }

    if (remark !== undefined) {
      updates.push('remark = ?');
      values.push(remark);
    }

    const timeFields = { confirmed: 'confirmed_at', shipped: 'shipped_at', completed: 'completed_at' };
    const timeField = timeFields[status];
    if (timeField) {
      updates.push(timeField + ' = NOW()');
    }

    await db.query('UPDATE exchanges SET ' + updates.join(', ') + ' WHERE id = ?', [...values, exchange.id]);
  }
}

module.exports = new ExchangesController();
