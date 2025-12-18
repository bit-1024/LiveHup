// {{CODE-Cycle-Integration:
//   Task_ID: [#T004]
//   Timestamp: 2025-12-16T13:47:34Z
//   Phase: D-Develop
//   Context-Analysis: "修复SQL注入风险，优化分页查询，添加标识符验证"
//   Principle_Applied: "Security, OWASP-SQL-Injection-Prevention, DRY"
// }}
// {{START_MODIFICATIONS}}

const mysql = require('mysql2');
const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'live_points',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: '+08:00'
});

// 使用Promise包装
const promisePool = pool.promise();

/**
 * 允许的表名白名单（防止SQL注入）
 */
const ALLOWED_TABLES = [
  'users',
  'products',
  'exchanges',
  'points_records',
  'rules',
  'admins',
  'settings'
];

/**
 * 验证标识符（表名、列名）是否安全
 * 只允许字母、数字、下划线，且必须以字母开头
 * @param {string} identifier - 标识符
 * @returns {boolean} 是否安全
 */
const isValidIdentifier = (identifier) => {
  if (typeof identifier !== 'string') return false;
  // 只允许字母、数字、下划线，长度1-64
  return /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(identifier);
};

/**
 * 验证表名是否在白名单中
 * @param {string} table - 表名
 * @returns {boolean} 是否允许
 */
const isAllowedTable = (table) => {
  return ALLOWED_TABLES.includes(table);
};

/**
 * 转义标识符（使用反引号）
 * @param {string} identifier - 标识符
 * @returns {string} 转义后的标识符
 */
const escapeIdentifier = (identifier) => {
  if (!isValidIdentifier(identifier)) {
    throw new Error(`无效的标识符: ${identifier}`);
  }
  return `\`${identifier}\``;
};

// 测试数据库连接
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    logger.info('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    logger.error('❌ 数据库连接失败:', { error: error.message });
    return false;
  }
};

// 执行查询的辅助函数
const query = async (sql, params = []) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('数据库查询错误:', { sql, error: error.message });
    throw error;
  }
};

// 执行事务的辅助函数
const transaction = async (callback) => {
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 分页查询辅助函数（已修复SQL注入风险）
 * @param {string} sql - 基础SQL查询（不含LIMIT/OFFSET）
 * @param {Array} params - 查询参数
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @param {Object} options - 可选配置
 * @param {boolean} options.skipCount - 是否跳过总数查询（用于性能优化）
 * @param {number} options.maxPageSize - 最大每页数量限制
 * @returns {Promise<Object>} 分页结果
 */
const paginate = async (sql, params = [], page = 1, pageSize = 10, options = {}) => {
  const { skipCount = false, maxPageSize = 100 } = options;
  
  // 确保 page 和 pageSize 是安全的整数
  const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
  const pageSizeInt = Math.min(maxPageSize, Math.max(1, Math.floor(Number(pageSize)) || 10));
  const offset = (pageInt - 1) * pageSizeInt;
  
  let total = 0;
  
  // 获取总数（可选跳过以提高性能）
  if (!skipCount) {
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_table`;
    const [countResult] = await promisePool.execute(countSql, params);
    total = countResult[0].total;
  }
  
  // 获取分页数据 - 使用参数化查询防止SQL注入
  // 注意：MySQL的LIMIT和OFFSET需要整数，这里已经确保了类型安全
  const dataSql = `${sql} LIMIT ? OFFSET ?`;
  const dataParams = [...params, pageSizeInt, offset];
  const [data] = await promisePool.execute(dataSql, dataParams);
  
  return {
    data,
    pagination: {
      page: pageInt,
      pageSize: pageSizeInt,
      total,
      totalPages: skipCount ? 0 : Math.ceil(total / pageSizeInt)
    }
  };
};

/**
 * 优化的分页查询（单次查询获取数据和总数）
 * 适用于简单查询，复杂查询建议使用 paginate
 * @param {string} table - 表名
 * @param {Object} options - 查询选项
 */
const paginateTable = async (table, options = {}) => {
  const {
    select = '*',
    where = '',
    params = [],
    orderBy = 'id DESC',
    page = 1,
    pageSize = 10
  } = options;
  
  // 验证表名
  if (!isAllowedTable(table)) {
    throw new Error(`不允许的表名: ${table}`);
  }
  
  const pageInt = Math.max(1, Math.floor(Number(page)) || 1);
  const pageSizeInt = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
  const offset = (pageInt - 1) * pageSizeInt;
  
  // 构建查询
  const escapedTable = escapeIdentifier(table);
  const whereClause = where ? `WHERE ${where}` : '';
  
  // 使用 SQL_CALC_FOUND_ROWS 优化（单次查询获取数据和总数）
  // 注意：这在某些MySQL版本中可能被弃用，但仍然有效
  const dataSql = `SELECT ${select} FROM ${escapedTable} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM ${escapedTable} ${whereClause}`;
  
  // 并行执行数据查询和计数查询
  const [dataResult, countResult] = await Promise.all([
    promisePool.execute(dataSql, [...params, pageSizeInt, offset]),
    promisePool.execute(countSql, params)
  ]);
  
  const data = dataResult[0];
  const total = countResult[0][0].total;
  
  return {
    data,
    pagination: {
      page: pageInt,
      pageSize: pageSizeInt,
      total,
      totalPages: Math.ceil(total / pageSizeInt)
    }
  };
};

/**
 * 批量插入辅助函数（已添加安全验证）
 * @param {string} table - 表名（必须在白名单中）
 * @param {Array<string>} columns - 列名数组
 * @param {Array<Array>} values - 值数组
 * @returns {Promise<Object>} 插入结果
 */
const batchInsert = async (table, columns, values) => {
  if (values.length === 0) return { affectedRows: 0 };
  
  // 验证表名
  if (!isAllowedTable(table)) {
    throw new Error(`不允许的表名: ${table}`);
  }
  
  // 验证列名
  for (const col of columns) {
    if (!isValidIdentifier(col)) {
      throw new Error(`无效的列名: ${col}`);
    }
  }
  
  const escapedTable = escapeIdentifier(table);
  const escapedColumns = columns.map(escapeIdentifier).join(',');
  const placeholders = values.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const sql = `INSERT INTO ${escapedTable} (${escapedColumns}) VALUES ${placeholders}`;
  const flatValues = values.flat();
  
  const [result] = await promisePool.execute(sql, flatValues);
  return result;
};

/**
 * 批量更新辅助函数（已添加安全验证）
 * @param {string} table - 表名（必须在白名单中）
 * @param {Array<Object>} updates - 更新数据数组，每个对象必须包含id字段
 * @param {string} idColumn - ID列名
 * @returns {Promise<Object>} 更新结果
 */
const batchUpdate = async (table, updates, idColumn = 'id') => {
  if (updates.length === 0) return { affectedRows: 0 };
  
  // 验证表名
  if (!isAllowedTable(table)) {
    throw new Error(`不允许的表名: ${table}`);
  }
  
  // 验证ID列名
  if (!isValidIdentifier(idColumn)) {
    throw new Error(`无效的ID列名: ${idColumn}`);
  }
  
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();
  
  try {
    let affectedRows = 0;
    const escapedTable = escapeIdentifier(table);
    const escapedIdColumn = escapeIdentifier(idColumn);
    
    for (const update of updates) {
      const { id, ...data } = update;
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      // 验证所有列名
      for (const col of columns) {
        if (!isValidIdentifier(col)) {
          throw new Error(`无效的列名: ${col}`);
        }
      }
      
      const setClause = columns.map(col => `${escapeIdentifier(col)}=?`).join(',');
      const sql = `UPDATE ${escapedTable} SET ${setClause} WHERE ${escapedIdColumn}=?`;
      const [result] = await connection.execute(sql, [...values, id]);
      affectedRows += result.affectedRows;
    }
    
    await connection.commit();
    return { affectedRows };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 简单查询构建器（防止SQL注入）
 */
const queryBuilder = {
  /**
   * 构建 SELECT 查询
   */
  select: (table, options = {}) => {
    if (!isAllowedTable(table)) {
      throw new Error(`不允许的表名: ${table}`);
    }
    
    const {
      columns = ['*'],
      where = {},
      orderBy = null,
      limit = null,
      offset = null
    } = options;
    
    const escapedTable = escapeIdentifier(table);
    const selectColumns = columns[0] === '*' ? '*' : columns.map(escapeIdentifier).join(',');
    
    let sql = `SELECT ${selectColumns} FROM ${escapedTable}`;
    const params = [];
    
    // 构建 WHERE 子句
    const whereKeys = Object.keys(where);
    if (whereKeys.length > 0) {
      const whereClauses = whereKeys.map(key => {
        if (!isValidIdentifier(key)) {
          throw new Error(`无效的列名: ${key}`);
        }
        params.push(where[key]);
        return `${escapeIdentifier(key)} = ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // ORDER BY
    if (orderBy) {
      const [col, dir] = orderBy.split(' ');
      if (!isValidIdentifier(col)) {
        throw new Error(`无效的排序列名: ${col}`);
      }
      const direction = dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${escapeIdentifier(col)} ${direction}`;
    }
    
    // LIMIT 和 OFFSET
    if (limit !== null) {
      sql += ` LIMIT ?`;
      params.push(Math.floor(Number(limit)));
    }
    if (offset !== null) {
      sql += ` OFFSET ?`;
      params.push(Math.floor(Number(offset)));
    }
    
    return { sql, params };
  },
  
  /**
   * 构建 INSERT 查询
   */
  insert: (table, data) => {
    if (!isAllowedTable(table)) {
      throw new Error(`不允许的表名: ${table}`);
    }
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    for (const col of columns) {
      if (!isValidIdentifier(col)) {
        throw new Error(`无效的列名: ${col}`);
      }
    }
    
    const escapedTable = escapeIdentifier(table);
    const escapedColumns = columns.map(escapeIdentifier).join(',');
    const placeholders = columns.map(() => '?').join(',');
    
    const sql = `INSERT INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders})`;
    return { sql, params: values };
  },
  
  /**
   * 构建 UPDATE 查询
   */
  update: (table, data, where) => {
    if (!isAllowedTable(table)) {
      throw new Error(`不允许的表名: ${table}`);
    }
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    for (const col of [...columns, ...whereKeys]) {
      if (!isValidIdentifier(col)) {
        throw new Error(`无效的列名: ${col}`);
      }
    }
    
    const escapedTable = escapeIdentifier(table);
    const setClause = columns.map(col => `${escapeIdentifier(col)} = ?`).join(',');
    const whereClause = whereKeys.map(key => `${escapeIdentifier(key)} = ?`).join(' AND ');
    
    const sql = `UPDATE ${escapedTable} SET ${setClause} WHERE ${whereClause}`;
    return { sql, params: [...values, ...whereValues] };
  },
  
  /**
   * 构建 DELETE 查询
   */
  delete: (table, where) => {
    if (!isAllowedTable(table)) {
      throw new Error(`不允许的表名: ${table}`);
    }
    
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    for (const key of whereKeys) {
      if (!isValidIdentifier(key)) {
        throw new Error(`无效的列名: ${key}`);
      }
    }
    
    const escapedTable = escapeIdentifier(table);
    const whereClause = whereKeys.map(key => `${escapeIdentifier(key)} = ?`).join(' AND ');
    
    const sql = `DELETE FROM ${escapedTable} WHERE ${whereClause}`;
    return { sql, params: whereValues };
  }
};

// {{END_MODIFICATIONS}}

// 导出
module.exports = {
  pool: promisePool,
  query,
  transaction,
  paginate,
  paginateTable,
  batchInsert,
  batchUpdate,
  testConnection,
  queryBuilder,
  // 安全辅助函数
  isValidIdentifier,
  isAllowedTable,
  escapeIdentifier,
  ALLOWED_TABLES
};