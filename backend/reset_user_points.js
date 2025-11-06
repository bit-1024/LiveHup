const db = require('./src/config/database');

async function resetUserPoints() {
  try {
    const userId = '470792309';
    
    console.log(`\n正在重置用户 ${userId} 的积分数据...`);
    
    // 删除该用户的所有积分记录
    const deleteResult = await db.query(
      'DELETE FROM point_records WHERE user_id = ?',
      [userId]
    );
    console.log(`✓ 已删除 ${deleteResult.affectedRows} 条积分记录`);
    
    // 重置用户积分为0
    const updateResult = await db.query(
      `UPDATE users 
       SET total_points = 0, 
           available_points = 0, 
           used_points = 0, 
           expired_points = 0 
       WHERE user_id = ?`,
      [userId]
    );
    console.log(`✓ 已重置用户积分，影响 ${updateResult.affectedRows} 行`);
    
    // 验证结果
    const [user] = await db.query(
      'SELECT user_id, username, total_points, available_points FROM users WHERE user_id = ?',
      [userId]
    );
    
    console.log('\n=== 重置后的用户状态 ===');
    console.log('用户ID:', user?.user_id);
    console.log('用户名:', user?.username);
    console.log('总积分:', user?.total_points);
    console.log('可用积分:', user?.available_points);
    
    console.log('\n✓ 重置完成！现在可以重新导入测试了。\n');
    
    process.exit(0);
  } catch (error) {
    console.error('重置失败:', error);
    process.exit(1);
  }
}

resetUserPoints();