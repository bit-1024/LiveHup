-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  system_name VARCHAR(100) DEFAULT '社群直播积分系统',
  logo_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认设置
INSERT INTO system_settings (id, system_name) VALUES (1, '社群直播积分系统')
ON DUPLICATE KEY UPDATE system_name = system_name;