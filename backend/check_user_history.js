const db = require('./src/config/database');

async function checkUserHistory() {
  try {
    // 查询用户470792309在最新批次之前的积分记录
    const allRecords = await db.query(
      `SELECT id, user_id, points, balance_after, source, rule_id, 
              import_batch, description, created_at 
       FROM point_records 
       WHERE user_id = '470792309' 
       ORDER BY created_at ASC`
    );
    
    console.log('\n=== 用户 470792309 的完整积分历史 ===');
    console.log('总记录数:', allRecords.length);
    
    let runningBalance = 0;
    allRecords.forEach((record, index) => {
      runningBalance += record.points;
      console.log(`\n[${index + 1}] 记录ID: ${record.id}`);
      console.log(`    积分变动: ${record.points}`);
      console.log(`    记录的余额: ${record.balance_after}`);
      console.log(`    计算的余额: ${runningBalance}`);
      console.log(`    批次: ${record.import_batch}`);
      console.log(`    来源: ${record.source}`);
      console.log(`    描述: ${record.description}`);
      console.log(`    时间: ${record.created_at}`);
    });
    
    // 查询用户当前状态
    const [user] = await db.query(
      `SELECT user_id, total_points, available_points, created_at, updated_at
       FROM users 
       WHERE user_id = '470792309'`
    );
    
    console.log('\n=== 用户当前状态 ===');
    console.log('总积分:', user?.total_points);
    console.log('可用积分:', user?.available_points);
    console.log('创建时间:', user?.created_at);
    console.log('更新时间:', user?.updated_at);
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkUserHistory();