const db = require('./src/config/database');

async function checkAllRecords() {
  try {
    // 查询用户470792309的所有积分记录
    const records = await db.query(
      `SELECT id, user_id, points, balance_after, source, rule_id, 
              import_batch, description, created_at 
       FROM point_records 
       WHERE user_id = '470792309' 
       ORDER BY id ASC`
    );
    
    console.log('\n=== 用户 470792309 的所有积分记录（按ID排序）===');
    console.log('总记录数:', records.length);
    records.forEach((record, index) => {
      console.log(`\n[${index + 1}] 记录ID: ${record.id}`);
      console.log(`    积分: ${record.points}`);
      console.log(`    余额: ${record.balance_after}`);
      console.log(`    批次: ${record.import_batch}`);
      console.log(`    创建时间: ${record.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkAllRecords();