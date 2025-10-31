const mysql = require('mysql2');
const dotenv = require('dotenv');

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

// 测试数据库连接
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
};

// 执行查询的辅助函数
const query = async (sql, params) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
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

// 分页查询辅助函数
const paginate = async (sql, params, page = 1, pageSize = 10) => {
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  
  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_table`;
  const [countResult] = await promisePool.execute(countSql, params);
  const total = countResult[0].total;
  
  // 获取分页数据
  const dataSql = `${sql} LIMIT ? OFFSET ?`;
  const [data] = await promisePool.execute(dataSql, [...params, limit, offset]);
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
};

// 批量插入辅助函数
const batchInsert = async (table, columns, values) => {
  if (values.length === 0) return { affectedRows: 0 };
  
  const placeholders = values.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
  const flatValues = values.flat();
  
  const [result] = await promisePool.execute(sql, flatValues);
  return result;
};

// 批量更新辅助函数
const batchUpdate = async (table, updates, idColumn = 'id') => {
  if (updates.length === 0) return { affectedRows: 0 };
  
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();
  
  try {
    let affectedRows = 0;
    for (const update of updates) {
      const { id, ...data } = update;
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const sql = `UPDATE ${table} SET ${columns.map(col => `${col}=?`).join(',')} WHERE ${idColumn}=?`;
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

// 导出
module.exports = {
  pool: promisePool,
  query,
  transaction,
  paginate,
  batchInsert,
  batchUpdate,
  testConnection
};