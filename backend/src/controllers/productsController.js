const path = require('path');
const db = require('../config/database');
const logger = require('../config/logger');
const { buildFileUrl, extractStoragePath } = require('../utils/file');

class ProductsController {
  /**
   * 获取商品列表
   */
  async getProducts(req, res) {
    try {
      const { 
        page = 1, 
        pageSize = 20, 
        category,
        is_active,
        keyword,
        sort_by = 'sort_order',
        sort_order = 'ASC'
      } = req.query;

      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];

      // 筛选条件
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      if (is_active !== undefined) {
        sql += ' AND is_active = ?';
        params.push(is_active === 'true' || is_active === '1');
      }

      if (keyword) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      // 排序
      const allowedSortFields = ['sort_order', 'points_required', 'sold_count', 'created_at'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'sort_order';
      const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      sql += ` ORDER BY ${sortField} ${sortDirection}`;

      const result = await db.paginate(sql, params, parseInt(page), parseInt(pageSize));

      const products = (result.data || []).map((item) => ({
        ...item,
        image_path: item.image_url,
        image_url: buildFileUrl(req, item.image_url)
      }));

      res.json({
        success: true,
        data: {
          list: products,
          total: result.pagination?.total || products.length
        },
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取商品列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取商品列表失败'
      });
    }
  }

  /**
   * 获取产品详情
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const [product] = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: '商品不存在'
        });
      }

      const formattedProduct = {
        ...product,
        image_path: product.image_url,
        image_url: buildFileUrl(req, product.image_url)
      };

      // 获取兑换统计
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total_exchanges,
          SUM(quantity) as total_quantity,
          SUM(points_used) as total_points
         FROM exchanges 
         WHERE product_id = ? AND status IN ('confirmed', 'shipped', 'completed')`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...formattedProduct,
          stats: stats || { total_exchanges: 0, total_quantity: 0, total_points: 0 }
        }
      });
    } catch (error) {
      logger.error('获取产品详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取产品详情失败'
      });
    }
  }

  /**
   * 创建商品
   */
  async createProduct(req, res) {
    try {
      const {
        name,
        description,
        points_required,
        original_price,
        stock,
        image_url,
        category,
        sort_order,
        is_hot,
        is_new
      } = req.body;

      if (!name || !points_required) {
        return res.status(400).json({
          success: false,
          message: '商品名称和所需积分不能为空'
        });
      }

      const storedImagePath = extractStoragePath(image_url);

      const result = await db.query(
        `INSERT INTO products 
         (name, description, points_required, original_price, stock, image_url, category, sort_order, is_hot, is_new) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          points_required,
          original_price || null,
          stock || 0,
          storedImagePath || null,
          category || null,
          sort_order || 0,
          is_hot || false,
          is_new || false
        ]
      );

      logger.info(`创建商品成功: ${name} (ID: ${result.insertId})`);

      res.json({
        success: true,
        message: '商品创建成功',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('创建商品失败:', error);
      res.status(500).json({
        success: false,
        message: '创建商品失败'
      });
    }
  }

  /**
   * 更新商品
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.image_url !== undefined) {
        updates.image_url = extractStoragePath(updates.image_url);
      }

      // 检查商品是否存在
      const [product] = await db.query(
        'SELECT id FROM products WHERE id = ?',
        [id]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: '商品不存在'
        });
      }

      // 构建更新语句
      const fields = [];
      const params = [];

      const allowedFields = [
        'name', 'description', 'points_required', 'original_price', 
        'stock', 'image_url', 'category', 'sort_order', 
        'is_active', 'is_hot', 'is_new', 'start_time', 'end_time'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有需要更新的字段'
        });
      }

      params.push(id);

      await db.query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      logger.info(`更新商品成功: ID ${id}`);

      res.json({
        success: true,
        message: '商品更新成功'
      });
    } catch (error) {
      logger.error('更新商品失败:', error);
      res.status(500).json({
        success: false,
        message: '更新商品失败'
      });
    }
  }

  /**
   * 删除商品
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      // 检查是否有兑换记录
      const [exchangeCount] = await db.query(
        'SELECT COUNT(*) as count FROM exchanges WHERE product_id = ?',
        [id]
      );

      if (exchangeCount.count > 0) {
        return res.status(400).json({
          success: false,
          message: '该商品已有兑换记录，无法删除'
        });
      }

      await db.query('DELETE FROM products WHERE id = ?', [id]);

      logger.info(`删除商品: ID ${id}`);

      res.json({
        success: true,
        message: '商品删除成功'
      });
    } catch (error) {
      logger.error('删除商品失败:', error);
      res.status(500).json({
        success: false,
        message: '删除商品失败'
      });
    }
  }

  /**
   * 批量上下架
   */
  async batchToggleProducts(req, res) {
    try {
      const { ids, is_active } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供商品ID列表'
        });
      }

      const placeholders = ids.map(() => '?').join(',');

      await db.query(
        `UPDATE products SET is_active = ? WHERE id IN (${placeholders})`,
        [is_active, ...ids]
      );

      logger.info(`批量${is_active ? '上架' : '下架'}商品: ${ids.join(', ')}`);

      res.json({
        success: true,
        message: `成功${is_active ? '上架' : '下架'} ${ids.length} 个商品`
      });
    } catch (error) {
      logger.error('批量操作商品失败:', error);
      res.status(500).json({
        success: false,
        message: '批量操作失败'
      });
    }
  }

  /**
   * 商品图片上传
   */
  async uploadProductImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '未接收到上传文件'
        });
      }

      const uploadsRoot = process.env.UPLOAD_PATH
        ? path.resolve(process.env.UPLOAD_PATH)
        : path.resolve(__dirname, '../../uploads');

      const relativePath = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');

      if (!relativePath || relativePath.startsWith('..')) {
        logger.error('商品图片路径解析异常:', {
          uploadsRoot,
          filePath: req.file.path,
          relativePath
        });
        return res.status(500).json({
          success: false,
          message: '图片保存路径异常，请联系管理员'
        });
      }

      const baseUrl = process.env.FILE_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/${relativePath}`;

      logger.info('商品图片上传成功', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          path: `/uploads/${relativePath}`
        }
      });
    } catch (error) {
      logger.error('商品图片上传失败:', error);
      res.status(500).json({
        success: false,
        message: '图片上传失败，请稍后重试'
      });
    }
  }

  /**
   * 获取商品分类列表
   */
  async getCategories(req, res) {
    try {
      const categories = await db.query(
        `SELECT 
          category,
          COUNT(*) as product_count
         FROM products 
         WHERE category IS NOT NULL AND is_active = true
         GROUP BY category
         ORDER BY category`
      );

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('获取分类列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分类列表失败'
      });
    }
  }

  /**
   * 获取商品统计
   */
  async getProductStats(req, res) {
    try {
      // 商品总数
      const [totalCount] = await db.query(
        'SELECT COUNT(*) as count FROM products'
      );

      // 在售商品数
      const [activeCount] = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE is_active = true'
      );

      // 库存预警（库存小于10且不是无限库存）
      const [lowStockCount] = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE stock < 10 AND stock >= 0 AND is_active = true'
      );

      // 热门商品
      const hotProducts = await db.query(
        `SELECT id, name, sold_count, points_required
         FROM products
         WHERE is_active = true
         ORDER BY sold_count DESC
         LIMIT 5`
      );

      res.json({
        success: true,
        data: {
          total: totalCount.count,
          active: activeCount.count,
          inactive: totalCount.count - activeCount.count,
          lowStock: lowStockCount.count,
          hotProducts
        }
      });
    } catch (error) {
      logger.error('获取商品统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      });
    }
  }
}

module.exports = new ProductsController();
