const db = require('./src/config/database');

(async () => {
  try {
    const userId = '310188072';
    const ruleId = 1;
    const description = '观看时长达标 - 直播观看时长:1小时2分45秒';
    
    console.log('查询参数:');
    console.log('userId:', userId);
    console.log('ruleId:', ruleId);
    console.log('description:', description);
    
    const [existingRecord] = await db.query(
      `SELECT id FROM point_records 
       WHERE user_id = ? AND rule_id = ? AND description = ? AND source = 'import'
       LIMIT 1`,
      [userId, ruleId, description]
    );
    
    console.log('\n查询结果:');
    console.log('existingRecord:', existingRecord);
    console.log('existingRecord.length:', existingRecord ? existingRecord.length : 'undefined');
    
    if (existingRecord && existingRecord.length > 0) {
      console.log('\n找到重复记录，应该跳过');
    } else {
      console.log('\n没有找到重复记录，可以插入');
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();