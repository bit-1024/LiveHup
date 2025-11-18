-- 社群直播数据积分管理系统数据库结构
-- MySQL 8.0+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS live_points CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE live_points;

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(100) UNIQUE NOT NULL COMMENT '用户唯一标识',
    username VARCHAR(100) COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    password_updated_at DATETIME NULL COMMENT '密码最近更新时间',
    phone VARCHAR(20) COMMENT '手机号',
    avatar VARCHAR(500) COMMENT '头像URL',
    total_points INT DEFAULT 0 COMMENT '历史总积分',
    available_points INT DEFAULT 0 COMMENT '当前可用积分',
    used_points INT DEFAULT 0 COMMENT '已使用积分',
    expired_points INT DEFAULT 0 COMMENT '已过期积分',
    is_new_user BOOLEAN DEFAULT TRUE COMMENT '是否新用户',
    first_import_date DATETIME COMMENT '首次导入日期',
    last_active_date DATETIME COMMENT '最后活跃日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_new_user (is_new_user),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================
-- 积分规则表
-- ============================================================
CREATE TABLE point_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    column_name VARCHAR(100) NOT NULL COMMENT '列名',
    condition_type ENUM('equals', 'greater_than', 'less_than', 'contains', 'range', 'not_equals', 'greater_or_equal', 'less_or_equal') NOT NULL COMMENT '条件类型',
    condition_value VARCHAR(255) NOT NULL COMMENT '条件值',
    points INT NOT NULL COMMENT '积分值',
    validity_days INT DEFAULT NULL COMMENT '有效期(天),NULL表示永久',
    priority INT DEFAULT 0 COMMENT '优先级,数字越大优先级越高',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    description TEXT COMMENT '规则说明',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_column_name (column_name),
    INDEX idx_is_active (is_active),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分规则表';

-- ============================================================
-- 积分记录表
-- ============================================================
CREATE TABLE point_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(100) NOT NULL COMMENT '用户ID',
    points INT NOT NULL COMMENT '积分变动(正数为增加,负数为减少)',
    balance_after INT NOT NULL COMMENT '变动后余额',
    source VARCHAR(50) NOT NULL COMMENT '来源:import/exchange/manual/expire',
    rule_id INT COMMENT '规则ID',
    expire_date DATE COMMENT '过期日期',
    is_expired BOOLEAN DEFAULT FALSE COMMENT '是否已过期',
    description TEXT COMMENT '说明',
    import_batch VARCHAR(100) COMMENT '导入批次号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_source (source),
    INDEX idx_expire_date (expire_date),
    INDEX idx_is_expired (is_expired),
    INDEX idx_import_batch (import_batch),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分记录表';

-- ============================================================
-- 导入历史表
-- ============================================================
CREATE TABLE import_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id VARCHAR(100) UNIQUE NOT NULL COMMENT '批次ID',
    filename VARCHAR(255) NOT NULL COMMENT '文件名',
    file_size INT COMMENT '文件大小(字节)',
    total_rows INT NOT NULL COMMENT '总行数',
    success_rows INT NOT NULL COMMENT '成功行数',
    failed_rows INT DEFAULT 0 COMMENT '失败行数',
    new_users INT DEFAULT 0 COMMENT '新用户数',
    existing_users INT DEFAULT 0 COMMENT '老用户数',
    total_points INT DEFAULT 0 COMMENT '总积分',
    import_status ENUM('processing', 'completed', 'failed', 'partial') DEFAULT 'processing' COMMENT '导入状态',
    error_message TEXT COMMENT '错误信息',
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    created_by VARCHAR(100) COMMENT '导入人',
    INDEX idx_batch_id (batch_id),
    INDEX idx_import_date (import_date),
    INDEX idx_import_status (import_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导入历史表';

-- ============================================================
-- 商品表
-- ============================================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    description TEXT COMMENT '商品描述',
    points_required INT NOT NULL COMMENT '所需积分',
    original_price DECIMAL(10,2) COMMENT '原价',
    stock INT DEFAULT 0 COMMENT '库存,-1表示无限库存',
    sold_count INT DEFAULT 0 COMMENT '已售数量',
    image_url VARCHAR(500) COMMENT '商品图片URL',
    category VARCHAR(50) COMMENT '商品分类',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否上架',
    is_hot BOOLEAN DEFAULT FALSE COMMENT '是否热门',
    is_new BOOLEAN DEFAULT FALSE COMMENT '是否新品',
    start_time DATETIME COMMENT '上架时间',
    end_time DATETIME COMMENT '下架时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_category (category),
    INDEX idx_sort_order (sort_order),
    INDEX idx_points_required (points_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- ============================================================
-- 兑换记录表
-- ============================================================
CREATE TABLE exchanges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exchange_no VARCHAR(50) UNIQUE NOT NULL COMMENT '兑换单号',
    user_id VARCHAR(100) NOT NULL COMMENT '用户ID',
    product_id INT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称(冗余)',
    product_image VARCHAR(500) COMMENT '商品图片(冗余)',
    points_used INT NOT NULL COMMENT '使用积分',
    quantity INT DEFAULT 1 COMMENT '兑换数量',
    status ENUM('pending', 'confirmed', 'shipped', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    contact_name VARCHAR(100) COMMENT '收货人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    shipping_address TEXT COMMENT '收货地址',
    tracking_number VARCHAR(100) COMMENT '物流单号',
    remark TEXT COMMENT '备注',
    exchange_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL COMMENT '确认时间',
    shipped_at TIMESTAMP NULL COMMENT '发货时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    cancelled_at TIMESTAMP NULL COMMENT '取消时间',
    cancel_reason TEXT COMMENT '取消原因',
    INDEX idx_exchange_no (exchange_no),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_exchange_date (exchange_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换记录表';

-- ============================================================
-- 管理员表
-- ============================================================
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码(BCrypt加密)',
    real_name VARCHAR(100) COMMENT '真实姓名',
    email VARCHAR(100) COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    role ENUM('super_admin', 'admin', 'operator') DEFAULT 'operator' COMMENT '角色',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) COMMENT '最后登录IP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- ============================================================
-- 系统配置表
-- ============================================================
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type VARCHAR(20) DEFAULT 'string' COMMENT '值类型:string/number/boolean/json',
    description VARCHAR(255) COMMENT '说明',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开(前端可访问)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================================
-- 操作日志表
-- ============================================================
CREATE TABLE operation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT COMMENT '管理员ID',
    admin_username VARCHAR(50) COMMENT '管理员用户名',
    operation VARCHAR(50) NOT NULL COMMENT '操作类型',
    module VARCHAR(50) NOT NULL COMMENT '模块名称',
    description TEXT COMMENT '操作描述',
    request_method VARCHAR(10) COMMENT '请求方法',
    request_url VARCHAR(500) COMMENT '请求URL',
    request_params TEXT COMMENT '请求参数',
    ip_address VARCHAR(50) COMMENT 'IP地址',
    user_agent VARCHAR(500) COMMENT '用户代理',
    status ENUM('success', 'failed') DEFAULT 'success' COMMENT '操作结果',
    error_message TEXT COMMENT '错误信息',
    execution_time INT COMMENT '执行时间(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_operation (operation),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================================
-- 插入初始数据
-- ============================================================

-- 插入默认管理员 (密码: admin123 - 实际使用时需要BCrypt加密)
INSERT INTO admins (username, password, real_name, role, email) VALUES 
('admin', '$2a$10$YourBCryptHashedPasswordHere', '系统管理员', 'super_admin', 'admin@example.com');

-- 插入系统配置
INSERT INTO system_config (config_key, config_value, config_type, description, is_public) VALUES 
('site_name', '社群积分系统', 'string', '网站名称', true),
('points_expire_reminder_days', '7', 'number', '积分过期提醒天数', false),
('exchange_audit_required', 'true', 'boolean', '兑换是否需要审核', false),
('max_exchange_per_day', '10', 'number', '每天最大兑换次数', true),
('min_points_for_exchange', '100', 'number', '最低兑换积分', true);

-- 插入示例积分规则
INSERT INTO point_rules (rule_name, column_name, condition_type, condition_value, points, validity_days, description) VALUES 
('观看时长达标', '观看时长', 'greater_or_equal', '30', 10, 30, '观看时长大于等于30分钟奖励10积分'),
('互动次数达标', '互动次数', 'greater_than', '5', 5, 30, '互动次数大于5次奖励5积分'),
('完整观看', '完成度', 'equals', '100', 20, 60, '完整观看直播奖励20积分'),
('新用户首次观看', '是否首次', 'equals', '是', 50, NULL, '新用户首次观看奖励50积分(永久有效)');

-- 插入示例商品
INSERT INTO products (name, description, points_required, original_price, stock, category, is_active, is_hot) VALUES 
('品牌水杯', '高档保温水杯,容量500ml', 200, 89.00, 100, '生活用品', true, true),
('蓝牙耳机', '无线蓝牙5.0耳机,降噪功能', 500, 199.00, 50, '数码产品', true, true),
('定制T恤', '社群专属T恤', 300, 69.00, 200, '服饰', true, false),
('电影票', '通用电影票兑换券', 150, 50.00, -1, '娱乐', true, false),
('优惠券10元', '全场通用10元优惠券', 50, 10.00, -1, '优惠券', true, false);

-- ============================================================
-- 创建视图
-- ============================================================

-- 用户积分汇总视图
CREATE OR REPLACE VIEW v_user_points_summary AS
SELECT 
    u.user_id,
    u.username,
    u.total_points,
    u.available_points,
    u.used_points,
    u.expired_points,
    u.is_new_user,
    u.first_import_date,
    COUNT(DISTINCT pr.id) as total_records,
    COUNT(DISTINCT CASE WHEN pr.source = 'import' THEN pr.id END) as import_count,
    COUNT(DISTINCT CASE WHEN pr.source = 'exchange' THEN pr.id END) as exchange_count,
    SUM(CASE WHEN pr.points > 0 AND pr.expire_date > CURDATE() THEN pr.points ELSE 0 END) as valid_points,
    SUM(CASE WHEN pr.is_expired = true THEN pr.points ELSE 0 END) as expired_points_detail
FROM users u
LEFT JOIN point_records pr ON u.user_id = pr.user_id
GROUP BY u.user_id;

-- 积分过期预警视图
CREATE OR REPLACE VIEW v_expiring_points AS
SELECT 
    pr.user_id,
    u.username,
    SUM(pr.points) as expiring_points,
    pr.expire_date,
    DATEDIFF(pr.expire_date, CURDATE()) as days_to_expire
FROM point_records pr
JOIN users u ON pr.user_id = u.user_id
WHERE pr.is_expired = false 
    AND pr.expire_date IS NOT NULL
    AND pr.expire_date > CURDATE()
    AND DATEDIFF(pr.expire_date, CURDATE()) <= 7
GROUP BY pr.user_id, pr.expire_date
ORDER BY pr.expire_date ASC;

-- 商品销售统计视图
CREATE OR REPLACE VIEW v_product_sales_stats AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.points_required,
    p.stock,
    p.sold_count,
    COUNT(e.id) as order_count,
    SUM(e.points_used) as total_points_used,
    SUM(e.quantity) as total_quantity
FROM products p
LEFT JOIN exchanges e ON p.id = e.product_id AND e.status IN ('confirmed', 'shipped', 'completed')
GROUP BY p.id;

-- ============================================================
-- 创建存储过程
-- ============================================================

-- 处理过期积分的存储过程
DELIMITER //

CREATE PROCEDURE sp_process_expired_points()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_user_id VARCHAR(100);
    DECLARE v_expired_points INT;
    
    -- 声明游标
    DECLARE cur CURSOR FOR 
        SELECT user_id, SUM(points) as expired_points
        FROM point_records
        WHERE is_expired = false 
            AND expire_date IS NOT NULL 
            AND expire_date < CURDATE()
        GROUP BY user_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- 标记过期记录
    UPDATE point_records 
    SET is_expired = true 
    WHERE is_expired = false 
        AND expire_date IS NOT NULL 
        AND expire_date < CURDATE();
    
    -- 打开游标
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_user_id, v_expired_points;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 更新用户积分
        UPDATE users 
        SET available_points = available_points - v_expired_points,
            expired_points = expired_points + v_expired_points
        WHERE user_id = v_user_id;
        
        -- 记录过期日志
        INSERT INTO point_records (user_id, points, balance_after, source, description)
        SELECT v_user_id, 
               -v_expired_points, 
               available_points,
               'expire', 
               CONCAT('积分过期扣除：', v_expired_points, '分')
        FROM users WHERE user_id = v_user_id;
        
    END LOOP;
    
    CLOSE cur;
    
    SELECT CONCAT('处理完成，共处理 ', ROW_COUNT(), ' 条记录') as result;
END //

DELIMITER ;

-- ============================================================
-- 创建定时任务事件
-- ============================================================

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- 创建每日凌晨1点处理过期积分的事件
CREATE EVENT IF NOT EXISTS evt_daily_expire_points
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 01:00:00')
DO
CALL sp_process_expired_points();

-- ============================================================
-- 创建触发器
-- ============================================================

-- 用户积分变动后更新统计
DELIMITER //

CREATE TRIGGER trg_after_point_record_insert
AFTER INSERT ON point_records
FOR EACH ROW
BEGIN
    IF NEW.source = 'import' OR NEW.source = 'manual' THEN
        UPDATE users 
        SET total_points = total_points + NEW.points,
            available_points = available_points + NEW.points,
            last_active_date = NOW()
        WHERE user_id = NEW.user_id;
    ELSEIF NEW.source = 'exchange' THEN
        UPDATE users 
        SET used_points = used_points + ABS(NEW.points),
            available_points = available_points - ABS(NEW.points),
            last_active_date = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
END //

-- 商品兑换后更新库存
CREATE TRIGGER trg_after_exchange_insert
AFTER INSERT ON exchanges
FOR EACH ROW
BEGIN
    IF NEW.status = 'confirmed' THEN
        UPDATE products 
        SET stock = stock - NEW.quantity,
            sold_count = sold_count + NEW.quantity
        WHERE id = NEW.product_id AND stock > 0;
    END IF;
END //

-- 兑换取消后恢复库存和积分
CREATE TRIGGER trg_after_exchange_cancelled
AFTER UPDATE ON exchanges
FOR EACH ROW
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- 恢复库存
        UPDATE products 
        SET stock = stock + NEW.quantity,
            sold_count = sold_count - NEW.quantity
        WHERE id = NEW.product_id AND stock >= 0;
        
        -- 返还积分
        INSERT INTO point_records (user_id, points, balance_after, source, description)
        SELECT NEW.user_id, 
               NEW.points_used, 
               available_points + NEW.points_used,
               'exchange', 
               CONCAT('兑换取消，返还积分：', NEW.points_used, '分，订单号：', NEW.exchange_no)
        FROM users WHERE user_id = NEW.user_id;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- 添加索引优化
-- ============================================================

-- 为常用查询添加组合索引
ALTER TABLE point_records ADD INDEX idx_user_expire (user_id, is_expired, expire_date);
ALTER TABLE exchanges ADD INDEX idx_user_status (user_id, status, exchange_date);
ALTER TABLE users ADD INDEX idx_points (available_points, total_points);

-- ============================================================
-- 完成
-- ============================================================
SELECT 'Database schema created successfully!' as message;