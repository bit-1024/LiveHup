-- 清理所有测试数据
-- 请在MySQL客户端或数据库管理工具中执行此脚本

-- 清理积分记录
DELETE FROM point_records;

-- 清理兑换记录
DELETE FROM exchanges;

-- 清理用户数据
DELETE FROM users;

-- 清理导入历史
DELETE FROM import_history;

-- 显示清理结果
SELECT '数据清理完成' as status;
SELECT COUNT(*) as remaining_users FROM users;
SELECT COUNT(*) as remaining_records FROM point_records;
SELECT COUNT(*) as remaining_exchanges FROM exchanges;
SELECT COUNT(*) as remaining_imports FROM import_history;