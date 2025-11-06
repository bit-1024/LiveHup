const db = require('./src/config/database');

async function resetAllPoints() {
  try {
    console.log('\n正在重置所有用户的积分数据...');
    
    // 删除所有积分记录
    const deleteResult = await db.query('DELETE FROM point_records');
    console.log(`✓ 已删除 ${deleteResult.affectedRows} 条积分记录`);
    
    // 重置所有用户积分为0
    const updateResult = await db.query(
      `UPDATE users 
       SET total_points = 0, 
           available_points = 0, 
           used_points = 0, 
           expired_points = 0`
    );
    console.log(`✓ 已重置所有用户积分，影响 ${updateResult.affectedRows} 行`);
    
    // 验证结果
    const [stats] = await db.query(
      `SELECT 
         COUNT(*) as total_users,
         SUM(total_points) as sum_total,
         SUM(available_points) as sum_available
       FROM users`
    );
    
    console.log('\n=== 重置后的统计 ===');
    console.log('用户总数:', stats.total_users);
    console.log('总积分合计:', stats.sum_total);
    console.log('可用积分合计:', stats.sum_available);
    
    console.log('\n✓ 所有用户积分已重置完成！\n');
    
    process.exit(0);
  } catch (error) {
    console.error('重置失败:', error);
    process.exit(1);
  }
}

resetAllPoints();