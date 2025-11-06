const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');
const { buildFileUrl } = require('../utils/file');

class ExchangesController {
  /**
   * 获取兑换列表
   */
  async getExchanges(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        user_id,
        status,
        keyword,
        start_date,
        end_date,
        sort_by = 'exchange_date',
        sort_order = 'DESC'
      } = req.query;

      let sql = `
        SELECT e.*
        FROM exchanges e
        WHERE 1=1
      `;
      const params = [];

      // 筛选条件
      if (user_id) {
        sql += ' AND e.user_id = ?';
        params.push(user_id);
      }

      if (status) {
        sql += ' AND e.status = ?';
        params.push(status);
      }

      if (keyword) {
        sql += ' AND (e.exchange_no LIKE ? OR e.product_name LIKE ? OR e.contact_name LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      if (start_date) {
        sql += ' AND e.exchange_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND e.exchange_date <= ?';
        params.push(moment(end_date).add(1, 'day').format('YYYY-MM-DD'));
      }

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
