const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');
const { buildFileUrl } = require('../utils/file');

/**
 * 构建兑换记录筛选条件，统一处理驼峰/下划线参数
 */
const buildExchangeFilterConditions = (query = {}) => {
  const params = [];
  let conditions = '';

  const rawUserId = query.user_id || query.userId;
  const userName = query.user_name || query.userName;
  
  if (rawUserId || userName) {
    if (rawUserId && userName) {
      conditions += ' AND (e.user_id = ? OR e.user_id IN (SELECT user_id FROM users WHERE user_name LIKE ?))';
      params.push(rawUserId, `%${userName}%`);
    } else if (rawUserId) {
      conditions += ' AND e.user_id = ?';
      params.push(rawUserId);
    } else {
      conditions += ' AND e.user_id IN (SELECT user_id FROM users WHERE user_name LIKE ?)';
      params.push(`%${userName}%`);
    }
  }

  const status = query.status;
  if (status) {
    conditions += ' AND e.status = ?';
    params.push(status);
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
  /**
   * 获取兑换列表
   */
  async getExchanges(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        sort_by = 'exchange_date',
        sort_order = 'DESC'
      } = req.query;

      let sql = `
        SELECT e.*
        FROM exchanges e
        WHERE 1=1
      `;
      const { conditions: filterConditions, params } = buildExchangeFilterConditions(req.query);
      sql += filterConditions;

      // 排序
      const allowedSortFields = ['exchange_date', 'points_used', 'status'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'exchange_date';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      sql += ` ORDER BY e.${sortField} ${sortDirection}`;

      const result = await db.paginate(sql, params, parseInt(page), parseInt(pageSize));

      const list = (result.data || []).map((item) => ({
        ...item,
        product_image: buildFileUrl(req, item.product_image)
      }));

      res.json({
        success: true,
        data: {
          list,
          total: result.pagination.total
        },
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取兑换列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取兑换列表失败'
      });
    }
  }

  /**
   * 获取兑换详情
   */
  async getExchangeDetail(req, res) {
    try {
      const { id } = req.params;

      const [exchange] = await db.query(
        `SELECT e.*, p.name as product_name, p.image_url as product_image, p.description as product_description
         FROM exchanges e
         LEFT JOIN products p ON e.product_id = p.id
         WHERE e.id = ?`,
        [id]
      );

      if (!exchange) {
        return res.status(404).json({
          success: false,
          message: '兑换记录不存在'
        });
      }

      const formattedExchange = {
        ...exchange,
        product_image: buildFileUrl(req, exchange.product_image)
      };

      res.json({
        success: true,
        data: formattedExchange
      });
    } catch (error) {
      logger.error('获取兑换详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取兑换详情失败'
      });
    }
  }

  /**
   * 创建兑换订单
   */
  async createExchange(req, res) {
    try {
      const {
        user_id,
        product_id,
        quantity = 1,
        contact_name,
        contact_phone,
        shipping_address,
        remark
      } = req.body;

      // 验证必填字段
      if (!user_id || !product_id) {
        return res.status(400).json({
          success: false,
          message: '用户ID和商品ID不能为空'
        });
      }

      // 检查用户是否存在
      const [user] = await db.query(
        'SELECT user_id, available_points FROM users WHERE user_id = ?',
        [user_id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 检查商品是否存在且可兑换
      const [product] = await db.query(
        'SELECT id, name, image_url, points_required, stock, is_active FROM products WHERE id = ?',
        [product_id]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: '商品不存在'
        });
      }

      if (!product.is_active) {
        return res.status(400).json({
          success: false,
          message: '商品已下架'
        });
      }

      // 检查库存（-1表示无限库存）
      if (product.stock !== -1 && product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: '商品库存不足'
        });
      }

      // 计算所需积分
      const totalPoints = product.points_required * quantity;

      // 检查用户积分是否足够
      if (user.available_points < totalPoints) {
        return res.status(400).json({
          success: false,
          message: '积分不足',
          data: {
            required: totalPoints,
            available: user.available_points,
            shortage: totalPoints - user.available_points
          }
        });
      }

      // 生成兑换单号
      const exchangeNo = `EX${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // 开启事务
      await db.transaction(async (connection) => {
        // 创建兑换记录
        const result = await connection.execute(
          `INSERT INTO exchanges 
           (exchange_no, user_id, product_id, product_name, product_image, points_used, quantity, 
            contact_name, contact_phone, shipping_address, remark, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            exchangeNo,
            user_id,
            product_id,
            product.name,
            product.image_url,
            totalPoints,
            quantity,
            contact_name || null,
            contact_phone || null,
            shipping_address || null,
            remark || null
          ]
        );

        const exchangeId = result.insertId;

        // 扣除用户积分并记录
        const newBalance = user.available_points - totalPoints;
        
        await connection.execute(
          `INSERT INTO point_records (user_id, points, balance_after, source, description)
           VALUES (?, ?, ?, 'exchange', ?)`,
          [
            user_id,
            -totalPoints,
            newBalance,
            `兑换商品: ${product.name} x${quantity}，订单号: ${exchangeNo}`
          ]
        );

        // 更新商品库存（如果不是无限库存）
        if (product.stock !== -1) {
          await connection.execute(
            'UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?',
            [quantity, quantity, product_id]
          );
        } else {
          await connection.execute(
            'UPDATE products SET sold_count = sold_count + ? WHERE id = ?',
            [quantity, product_id]
          );
        }

        logger.info(`创建兑换订单成功: ${exchangeNo}, 用户: ${user_id}, 商品: ${product.name}`);

        res.json({
          success: true,
          message: '兑换成功',
          data: {
            exchange_id: exchangeId,
            exchange_no: exchangeNo,
            points_used: totalPoints
          }
        });
      });

    } catch (error) {
      logger.error('创建兑换订单失败:', error);
      res.status(500).json({
        success: false,
        message: '兑换失败，请稍后重试'
      });
    }
  }

  /**
   * 更新兑换状态（管理员）
   */
  async updateExchange(req, res) {
    try {
      const { id } = req.params;
      const { status, tracking_number, remark } = req.body;

      // 检查兑换记录是否存在
      const [exchange] = await db.query(
        'SELECT id, status FROM exchanges WHERE id = ?',
        [id]
      );

      if (!exchange) {
        return res.status(404).json({
          success: false,
          message: '兑换记录不存在'
        });
      }

      // 不能修改已完成或已取消的订单
      if (['completed', 'cancelled'].includes(exchange.status)) {
        return res.status(400).json({
          success: false,
          message: `订单状态为${exchange.status === 'completed' ? '已完成' : '已取消'}，无法修改`
        });
      }

      const updates = [];
      const params = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);

        // 根据状态更新相应的时间戳
        if (status === 'confirmed') {
          updates.push('confirmed_at = NOW()');
        } else if (status === 'shipped') {
          updates.push('shipped_at = NOW()');
        } else if (status === 'completed') {
          updates.push('completed_at = NOW()');
        }
      }

      if (tracking_number !== undefined) {
        updates.push('tracking_number = ?');
        params.push(tracking_number);
      }

      if (remark !== undefined) {
        updates.push('remark = ?');
        params.push(remark);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有需要更新的字段'
        });
      }

      params.push(id);

      await db.query(
        `UPDATE exchanges SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      logger.info(`更新兑换订单: ID ${id}, 状态: ${status || '未变更'}`);

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      logger.error('更新兑换状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新失败'
      });
    }
  }

  /**
   * 批量更新兑换状态（管理员）
   */
  async batchUpdateStatus(req, res) {
    try {
      const { ids, status, tracking_number, remark } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要更新的记录'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: '请选择要更新的状态'
        });
      }

      // 检查所有记录是否存在且可修改
      const placeholders = ids.map(() => '?').join(',');
      const exchanges = await db.query(
        `SELECT id, status FROM exchanges WHERE id IN (${placeholders})`,
        ids
      );

      if (exchanges.length !== ids.length) {
        return res.status(404).json({
          success: false,
          message: '部分记录不存在'
        });
      }

      // 检查是否有已完成或已取消的订单
      const invalidExchanges = exchanges.filter(e =>
        ['completed', 'cancelled'].includes(e.status)
      );

      if (invalidExchanges.length > 0) {
        return res.status(400).json({
          success: false,
          message: '选中的记录中包含已完成或已取消的订单，无法修改'
        });
      }

      const updates = ['status = ?'];
      const params = [status];

      // 根据状态更新相应的时间戳
      if (status === 'confirmed') {
        updates.push('confirmed_at = NOW()');
      } else if (status === 'shipped') {
        updates.push('shipped_at = NOW()');
      } else if (status === 'completed') {
        updates.push('completed_at = NOW()');
      }

      if (tracking_number !== undefined) {
        updates.push('tracking_number = ?');
        params.push(tracking_number);
      }

      if (remark !== undefined) {
        updates.push('remark = ?');
        params.push(remark);
      }

      params.push(...ids);

      await db.query(
        `UPDATE exchanges SET ${updates.join(', ')} WHERE id IN (${placeholders})`,
        params
      );

      logger.info(`批量更新兑换订单: ${ids.length}条记录, 状态: ${status}`);

      res.json({
        success: true,
        message: `成功更新${ids.length}条记录`
      });
    } catch (error) {
      logger.error('批量更新兑换状态失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新失败'
      });
    }
  }

  /**
   * 取消兑换
   */
  async cancelExchange(req, res) {
    try {
      const { id } = req.params;
      const { cancel_reason } = req.body;

      // 获取兑换记录详情
      const [exchange] = await db.query(
        'SELECT id, user_id, product_id, points_used, quantity, status, exchange_no FROM exchanges WHERE id = ?',
        [id]
      );

      if (!exchange) {
        return res.status(404).json({
          success: false,
          message: '兑换记录不存在'
        });
      }

      // 只有pending和confirmed状态可以取消
      if (!['pending', 'confirmed'].includes(exchange.status)) {
        return res.status(400).json({
          success: false,
          message: '当前状态不支持取消操作'
        });
      }

      // 开启事务处理取消逻辑
      await db.transaction(async (connection) => {
        // 更新订单状态
        await connection.execute(
          `UPDATE exchanges 
           SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ?
           WHERE id = ?`,
          [cancel_reason || '用户取消', id]
        );

        // 获取用户当前积分
        const [user] = await connection.query(
          'SELECT available_points FROM users WHERE user_id = ?',
          [exchange.user_id]
        );

        // 返还积分
        const newBalance = user.available_points + exchange.points_used;
        
        await connection.execute(
          `INSERT INTO point_records (user_id, points, balance_after, source, description)
           VALUES (?, ?, ?, 'exchange', ?)`,
          [
            exchange.user_id,
            exchange.points_used,
            newBalance,
            `兑换取消，返还积分，订单号: ${exchange.exchange_no}`
          ]
        );

        // 恢复商品库存
        await connection.execute(
          `UPDATE products 
           SET stock = CASE WHEN stock >= 0 THEN stock + ? ELSE stock END,
               sold_count = sold_count - ?
           WHERE id = ?`,
          [exchange.quantity, exchange.quantity, exchange.product_id]
        );
      });

      logger.info(`取消兑换订单: ${exchange.exchange_no}, 返还积分: ${exchange.points_used}`);

      res.json({
        success: true,
        message: '取消成功，积分已返还'
      });
    } catch (error) {
      logger.error('取消兑换失败:', error);
      res.status(500).json({
        success: false,
        message: '取消失败'
      });
    }
  }


  /**
   * 导出兑换记录
   */
  async exportExchanges(req, res) {
    try {
      let sql = `
        SELECT 
          e.exchange_no,
          e.user_id,
          e.product_name,
          e.quantity,
          e.points_used,
          e.status,
          e.contact_name,
          e.contact_phone,
          e.shipping_address,
          e.tracking_number,
          e.remark,
          e.exchange_date,
          e.confirmed_at,
          e.shipped_at,
          e.completed_at,
          e.cancelled_at
        FROM exchanges e
        WHERE 1=1
      `;
      const { conditions: filterConditions, params } = buildExchangeFilterConditions(req.query);
      sql += filterConditions;
      sql += ' ORDER BY e.exchange_date DESC LIMIT 10000';

      const exchanges = await db.query(sql, params);

      if (!exchanges || exchanges.length === 0) {
        return res.status(404).json({
          success: false,
          message: '暂无可导出的数据'
        });
      }

      const statusMap = {
        pending: '待处理',
        confirmed: '已确认',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消'
      };

      const formatTime = (value) => value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : '';

      const exportData = exchanges.map((item) => ({
        '兑换单号': item.exchange_no,
        '用户ID': item.user_id,
        '商品名称': item.product_name,
        '兑换数量': item.quantity,
        '消耗积分': item.points_used,
        '订单状态': statusMap[item.status] || item.status,
        '联系人': item.contact_name || '',
        '联系电话': item.contact_phone || '',
        '收货地址': item.shipping_address || '',
        '快递单号': item.tracking_number || '',
        '备注': item.remark || '',
        '下单时间': formatTime(item.exchange_date),
        '确认时间': formatTime(item.confirmed_at),
        '发货时间': formatTime(item.shipped_at),
        '完成时间': formatTime(item.completed_at),
        '取消时间': formatTime(item.cancelled_at)
      }));

      const xlsx = require('xlsx');
      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, '兑换记录');

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=exchanges_${Date.now()}.xlsx`);

      res.send(buffer);
    } catch (error) {
      logger.error('导出兑换数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出失败'
      });
    }
  }

  /**
   * 获取兑换统计
   */
  async getExchangeStats(req, res) {
    try {
      // 总兑换订单数
      const [totalCount] = await db.query(
        'SELECT COUNT(*) as count FROM exchanges'
      );

      // 各状态订单数
      const statusStats = await db.query(
        `SELECT status, COUNT(*) as count 
         FROM exchanges 
         GROUP BY status`
      );

      // 今日兑换数
      const [todayCount] = await db.query(
        `SELECT COUNT(*) as count 
         FROM exchanges 
         WHERE DATE(exchange_date) = CURDATE()`
      );

      // 总兑换积分
      const [totalPoints] = await db.query(
        `SELECT SUM(points_used) as total 
         FROM exchanges 
         WHERE status IN ('confirmed', 'shipped', 'completed')`
      );

      // 近7天兑换趋势
      const trend = await db.query(
        `SELECT 
           DATE(exchange_date) as date,
           COUNT(*) as count,
           SUM(points_used) as points
         FROM exchanges
         WHERE exchange_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(exchange_date)
         ORDER BY date ASC`
      );

      res.json({
        success: true,
        data: {
          total: totalCount.count,
          today: todayCount.count,
          totalPoints: totalPoints.total || 0,
          statusStats,
          trend
        }
      });
    } catch (error) {
      logger.error('获取兑换统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      });
    }
  }
}

module.exports = new ExchangesController();
