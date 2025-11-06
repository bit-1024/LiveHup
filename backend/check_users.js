const db = require('./src/config/database');

(async () => {
  try {
    const users = await db.query(
      'SELECT user_id, username, total_points, available_points FROM users WHERE user_id IN (?, ?, ?) ORDER BY user_id',
      ['310188072', '382629250', '335365172']
    );
    console.log(JSON.stringify(users, null, 2));
    
    // 检查这些用户的积分记录
    const records = await db.query(
      'SELECT user_id, points, rule_id, description, created_at FROM point_records WHERE user_id IN (?, ?, ?) ORDER BY user_id, created_at',
      ['310188072', '382629250', '335365172']
    );
    console.log('\n积分记录:');
    console.log(JSON.stringify(records, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();