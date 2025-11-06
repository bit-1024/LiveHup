const db = require('./src/config/database');

async function checkPoints() {
  try {
    // 查询用户470792309的积分记录
    const records = await db.query(
      `SELECT id, user_id, points, balance_after, source, rule_id, 
              import_batch, description, created_at 
       FROM point_records 
       WHERE user_id = '470792309' 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    console.log('\n=== 用户 470792309 的积分记录 ===');
    console.log('总记录数:', records.length);
    records.forEach(record => {
      console.log('\n记录ID:', record.id);
      console.log('积分:', record.points);
      console.log('余额:', record.balance_after);
      console.log('来源:', record.source);
      console.log('规则ID:', record.rule_id);
      console.log('批次ID:', record.import_batch);
      console.log('描述:', record.description);
      console.log('创建时间:', record.created_at);
    });
    
    // 查询用户表
    const [user] = await db.query(
      `SELECT user_id, username, total_points, available_points, 
              used_points, expired_points 
       FROM users 
       WHERE user_id = '470792309'`
    );
    
    console.log('\n=== 用户表信息 ===');
    console.log('用户ID:', user?.user_id);
    console.log('用户名:', user?.username);
    console.log('总积分:', user?.total_points);
    console.log('可用积分:', user?.available_points);
    console.log('已用积分:', user?.used_points);
    console.log('过期积分:', user?.expired_points);
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkPoints();