-- 为用户表新增密码相关字段
ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NOT NULL COMMENT '用户密码哈希（bcrypt）' AFTER username,
  ADD COLUMN password_updated_at DATETIME NULL COMMENT '记录密码最后一次更新时间' AFTER password_hash;

-- 初始化所有空密码，默认密码为 123456（请尽快修改）
UPDATE users
SET password_hash = '$2a$10$rgety/g2c1jDkBgz/Sx3h.a1rND/ofMwwqqdRCF3b613TT2Oa1cAW',
    password_updated_at = NULL
WHERE password_hash IS NULL OR password_hash = '';

-- 若 UPDATE 执行完毕仍需多次运行脚本，请将上方的硬编码默认密码改为动态值
