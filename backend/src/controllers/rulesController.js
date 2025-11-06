const db = require('../config/database');
const logger = require('../config/logger');

class RulesController {
  /**
   * 创建积分规则
   */
  async createRule(req, res) {
    try {
      const {
        rule_name,
        column_name,
        condition_type,
        condition_value,
        points,
        validity_days,
        priority,
        description
      } = req.body;

      // 验证必填字段
      if (!rule_name || !column_name || !condition_type || !condition_value || points === undefined) {
        return res.status(400).json({
          success: false,
          message: '请填写完整的规则信息'
        });
      }

      // 验证积分值
      if (isNaN(points)) {
        return res.status(400).json({
          success: false,
          message: '积分必须是数字'
        });
      }

      // 验证条件类型
      const validConditionTypes = [
        'equals', 'not_equals', 
        'greater_than', 'greater_or_equal', 
        'less_than', 'less_or_equal', 
        'contains', 'range'
      ];
      
      if (!validConditionTypes.includes(condition_type)) {
        return res.status(400).json({
          success: false,
          message: '无效的条件类型'
        });
      }

      // 如果是范围类型，验证格式
      if (condition_type === 'range') {
        const rangeParts = condition_value.split(',');
        if (rangeParts.length !== 2 || isNaN(rangeParts[0]) || isNaN(rangeParts[1])) {
          return res.status(400).json({
            success: false,
            message: '范围格式错误，应为：最小值,最大值'
          });
        }
      }

      const result = await db.query(
        `INSERT INTO point_rules 
         (rule_name, column_name, condition_type, condition_value, points, validity_days, priority, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rule_name,
          column_name,
          condition_type,
          condition_value,
          points,
          validity_days || null,
          priority || 0,
          description || null
        ]
      );

      logger.info(`创建积分规则成功: ${rule_name} (ID: ${result.insertId})`);

      res.json({
        success: true,
        message: '规则创建成功',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('创建规则失败:', error);
      res.status(500).json({
        success: false,
        message: '创建规则失败: ' + error.message
      });
    }
  }

  /**
   * 获取所有规则
   */
  async getRules(req, res) {
    try {
      const { is_active, page = 1, pageSize = 50 } = req.query;
      
      let sql = 'SELECT * FROM point_rules';
      const params = [];
      
      if (is_active !== undefined) {
        sql += ' WHERE is_active = ?';
        params.push(is_active === 'true' || is_active === '1');
      }
      
      sql += ' ORDER BY priority DESC, created_at DESC';
      
      const result = await db.paginate(sql, params, parseInt(page), parseInt(pageSize));
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取规则列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取规则列表失败'
      });
    }
  }

  /**
   * 获取单个规则详情
   */
  async getRuleById(req, res) {
    try {
      const { id } = req.params;
      
      const [rule] = await db.query(
        'SELECT * FROM point_rules WHERE id = ?',
        [id]
      );
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '规则不存在'
        });
      }
      
      // 获取该规则的使用统计
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as usage_count,
          SUM(points) as total_points,
          COUNT(DISTINCT user_id) as affected_users
         FROM point_records 
         WHERE rule_id = ?`,
        [id]
      );
      
      res.json({
        success: true,
        data: {
          ...rule,
          stats: stats || { usage_count: 0, total_points: 0, affected_users: 0 }
        }
      });
    } catch (error) {
      logger.error('获取规则详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取规则详情失败'
      });
    }
  }

  /**
   * 更新规则
   */
  async updateRule(req, res) {
    try {
      const { id } = req.params;
      const {
        rule_name,
        column_name,
        condition_type,
        condition_value,
        points,
        validity_days,
        priority,
        is_active,
        description
      } = req.body;

      // 检查规则是否存在
      const [existingRule] = await db.query(
        'SELECT id FROM point_rules WHERE id = ?',
        [id]
      );
      
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: '规则不存在'
        });
      }

      // 构建更新语句
      const updates = [];
      const params = [];
      
      if (rule_name !== undefined) {
        updates.push('rule_name = ?');
        params.push(rule_name);
      }
      if (column_name !== undefined) {
        updates.push('column_name = ?');
        params.push(column_name);
      }
      if (condition_type !== undefined) {
        updates.push('condition_type = ?');
        params.push(condition_type);
      }
      if (condition_value !== undefined) {
        updates.push('condition_value = ?');
        params.push(condition_value);
      }
      if (points !== undefined) {
        updates.push('points = ?');
        params.push(points);
      }
      if (validity_days !== undefined) {
        updates.push('validity_days = ?');
        params.push(validity_days);
      }
      if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有需要更新的字段'
        });
      }
      
      params.push(id);
      
      await db.query(
        `UPDATE point_rules SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      logger.info(`更新积分规则成功: ID ${id}`);

      res.json({
        success: true,
        message: '规则更新成功'
      });
    } catch (error) {
      logger.error('更新规则失败:', error);
      res.status(500).json({
        success: false,
        message: '更新规则失败: ' + error.message
      });
    }
  }

  /**
   * 删除规则
   */
  async deleteRule(req, res) {
    try {
      const { id } = req.params;
      
      // 检查规则是否存在
      const [rule] = await db.query(
        'SELECT id, rule_name FROM point_rules WHERE id = ?',
        [id]
      );
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '规则不存在'
        });
      }
      
      // 检查是否有关联的积分记录
      const [recordCount] = await db.query(
        'SELECT COUNT(*) as count FROM point_records WHERE rule_id = ?',
        [id]
      );
      
      if (recordCount.count > 0) {
        return res.status(400).json({
          success: false,
          message: `该规则已被使用 ${recordCount.count} 次，无法删除。建议禁用规则。`
        });
      }
      
      await db.query('DELETE FROM point_rules WHERE id = ?', [id]);
      
      logger.info(`删除积分规则: ${rule.rule_name} (ID: ${id})`);
      
      res.json({
        success: true,
        message: '规则删除成功'
      });
    } catch (error) {
      logger.error('删除规则失败:', error);
      res.status(500).json({
        success: false,
        message: '删除规则失败: ' + error.message
      });
    }
  }

  /**
   * 批量启用/禁用规则
   */
  async batchToggleRules(req, res) {
    try {
      const { ids, is_active } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供规则ID列表'
        });
      }
      
      if (is_active === undefined) {
        return res.status(400).json({
          success: false,
          message: '请指定启用或禁用状态'
        });
      }
      
      const placeholders = ids.map(() => '?').join(',');
      
      await db.query(
        `UPDATE point_rules SET is_active = ? WHERE id IN (${placeholders})`,
        [is_active, ...ids]
      );
      
      logger.info(`批量${is_active ? '启用' : '禁用'}规则: ${ids.join(', ')}`);
      
      res.json({
        success: true,
        message: `成功${is_active ? '启用' : '禁用'} ${ids.length} 条规则`
      });
    } catch (error) {
      logger.error('批量操作规则失败:', error);
      res.status(500).json({
        success: false,
        message: '批量操作失败'
      });
    }
  }

  /**
   * 复制规则
   */
  async copyRule(req, res) {
    try {
      const { id } = req.params;
      
      const [rule] = await db.query(
        'SELECT * FROM point_rules WHERE id = ?',
        [id]
      );
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '规则不存在'
        });
      }
      
      // 创建副本
      const result = await db.query(
        `INSERT INTO point_rules 
         (rule_name, column_name, condition_type, condition_value, points, validity_days, priority, description, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${rule.rule_name} (副本)`,
          rule.column_name,
          rule.condition_type,
          rule.condition_value,
          rule.points,
          rule.validity_days,
          rule.priority,
          rule.description,
          false // 副本默认禁用
        ]
      );
      
      logger.info(`复制规则: ${rule.rule_name} -> ID ${result.insertId}`);
      
      res.json({
        success: true,
        message: '规则复制成功',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('复制规则失败:', error);
      res.status(500).json({
        success: false,
        message: '复制规则失败'
      });
    }
  }

  /**
   * 获取规则统计信息
   */
  async getRuleStats(req, res) {
    try {
      // 总规则数
      const [totalCount] = await db.query(
        'SELECT COUNT(*) as count FROM point_rules'
      );
      
      // 激活规则数
      const [activeCount] = await db.query(
        'SELECT COUNT(*) as count FROM point_rules WHERE is_active = true'
      );
      
      // 最近30天使用最多的规则
      const topRules = await db.query(
        `SELECT 
          pr.id,
          pr.rule_name,
          COUNT(ptr.id) as usage_count,
          SUM(ptr.points) as total_points
         FROM point_rules pr
         LEFT JOIN point_records ptr ON pr.id = ptr.rule_id 
           AND ptr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         WHERE pr.is_active = true
         GROUP BY pr.id, pr.rule_name
         ORDER BY usage_count DESC
         LIMIT 10`
      );
      
      res.json({
        success: true,
        data: {
          total: totalCount.count,
          active: activeCount.count,
          inactive: totalCount.count - activeCount.count,
          topRules
        }
      });
    } catch (error) {
      logger.error('获取规则统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      });
    }
  }

  /**
   * 获取最近导入文件的列名
   */
  async getAvailableColumns(req, res) {
    try {
      const latestImport = await db.query(
        `SELECT pr.description
         FROM point_records pr
         WHERE pr.source = 'import'
         ORDER BY pr.created_at DESC
         LIMIT 100`
      );
      
      const columnSet = new Set();
      if (Array.isArray(latestImport)) {
        latestImport.forEach(record => {
          if (record.description) {
            const match = record.description.match(/^(.+?)\s*-\s*(.+?):/);
            if (match && match[2]) {
              columnSet.add(match[2].trim());
            }
          }
        });
      }
      
      const columns = Array.from(columnSet);
      
      res.json({
        success: true,
        data: columns.length > 0 ? columns : [
          '直播观看时长', '用户昵称', '用户ID', '区域', 
          '首次观看直播时间', '最后离开直播时间', '最近观看直播时间', 
          '邀请人id', '邀请人名字', 'ip'
        ]
      });
    } catch (error) {
      logger.error('获取可用列名失败:', error);
      res.json({
        success: true,
        data: [
          '直播观看时长', '用户昵称', '用户ID', '区域', 
          '首次观看直播时间', '最后离开直播时间', '最近观看直播时间', 
          '邀请人id', '邀请人名字', 'ip'
        ]
      });
    }
  }
}

module.exports = new RulesController();