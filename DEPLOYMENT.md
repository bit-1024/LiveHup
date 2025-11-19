# 社群直播数据积分管理系统 - 服务器部署指南

## 系统概述

本系统包含三个部分：
- **Backend**: Node.js + Express 后端API服务
- **Admin**: React PC管理端
- **Mobile**: React 移动端H5页面

**适用服务器配置**: 2核2G（最低配置）

## ⚠️ 重要提示（针对2G内存服务器）

由于React项目构建需要大量内存，2G内存服务器**无法直接在服务器上构建**前端项目。本文档提供两种解决方案：

### 方案一：本地构建后上传（推荐）✅
在本地电脑构建好前端项目，只上传构建产物到服务器。**适合新手，简单快速**。

### 方案二：服务器构建（需配置Swap）
在服务器上配置虚拟内存后进行构建。**需要一定Linux基础**。

**本文档将详细说明两种方案的完整步骤。**

---

## 📋 目录

- [一、服务器环境准备](#一服务器环境准备)
- [二、数据库配置](#二数据库配置)
- [三、后端部署](#三后端部署)
- [四、前端部署 - 方案一（本地构建）](#四前端部署---方案一本地构建推荐)
- [五、前端部署 - 方案二（服务器构建）](#五前端部署---方案二服务器构建)
- [六、Nginx配置](#六nginx配置)
- [七、其他配置](#七其他配置)

---

## 一、服务器环境准备

### 1.1 连接服务器

```bash
# 使用SSH连接服务器（替换为你的服务器IP）
ssh root@你的服务器IP

# 如果使用密钥登录
ssh -i /path/to/your/key.pem root@你的服务器IP
```

### 1.2 更新系统

```bash
# Ubuntu/Debian系统
sudo apt update
sudo apt upgrade -y
```

### 1.3 安装 Node.js (v16推荐)

```bash
# 方法一：使用NodeSource仓库（推荐）
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v16.x.x
npm -v   # 应显示 8.x.x
```

### 1.4 安装 MySQL 5.7+

```bash
# 安装MySQL
sudo apt install mysql-server -y

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置（按提示设置root密码）
sudo mysql_secure_installation
```

**配置说明**：
- 设置root密码：选择 `Y`，输入强密码
- 删除匿名用户：选择 `Y`
- 禁止root远程登录：选择 `Y`
- 删除测试数据库：选择 `Y`
- 重新加载权限表：选择 `Y`

### 1.5 安装 Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装（浏览器访问服务器IP应看到Nginx欢迎页）
```

### 1.6 安装 PM2 进程管理器

```bash
sudo npm install -g pm2
pm2 -v  # 验证安装
```

---

## 二、数据库配置

### 2.1 创建数据库和用户

```bash
# 登录MySQL（输入之前设置的root密码）
sudo mysql -u root -p
```

在MySQL命令行中执行：

```sql
-- 创建数据库
CREATE DATABASE live_points CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（请修改密码为强密码）
CREATE USER 'livepoints'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- 授权
GRANT ALL PRIVILEGES ON live_points.* TO 'livepoints'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

**⚠️ 重要**：请将 `your_strong_password_here` 替换为强密码，并记录下来。

### 2.2 测试数据库连接

```bash
# 测试新用户登录
mysql -u livepoints -p live_points

# 输入密码后，如果能登录成功，输入 EXIT; 退出
```

---

## 三、后端部署

### 3.1 创建项目目录

```bash
# 创建目录
sudo mkdir -p /var/www/livehup
cd /var/www/livehup
```

### 3.2 上传后端代码

**方法A：使用FTP工具（推荐新手）**

1. 下载 FileZilla 或 WinSCP
2. 连接到服务器
3. 将本地的 `backend` 和 `database` 文件夹上传到 `/var/www/livehup/`

**方法B：使用SCP命令**

```bash
# 在本地电脑执行（先打包）
cd /path/to/your/project
tar -czf backend.tar.gz backend database

# 上传到服务器
scp backend.tar.gz root@你的服务器IP:/var/www/livehup/

# 在服务器上解压
cd /var/www/livehup
tar -xzf backend.tar.gz
rm backend.tar.gz
```

### 3.3 配置后端环境变量

```bash
cd /var/www/livehup/backend
cp .env.example .env
nano .env  # 或使用 vi .env
```

编辑 `.env` 文件（按 `Ctrl+X`，然后 `Y`，再按 `Enter` 保存）：

```env
# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（修改为你的密码）
DB_HOST=localhost
DB_PORT=3306
DB_USER=livepoints
DB_PASSWORD=your_strong_password_here
DB_NAME=live_points
DB_CONNECTION_LIMIT=10

# JWT配置（务必修改为随机字符串）
JWT_SECRET=请生成一个至少32位的随机字符串
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

# 跨域配置（修改为你的域名或IP）
CORS_ORIGIN=http://你的服务器IP,http://你的服务器IP:3001

# 日志配置
LOG_LEVEL=info
LOG_PATH=./logs

# 积分配置
DEFAULT_POINTS_VALIDITY_DAYS=90
POINTS_EXPIRE_REMINDER_DAYS=7

# 兑换配置
MAX_EXCHANGE_PER_DAY=10
MIN_POINTS_FOR_EXCHANGE=100
EXCHANGE_AUDIT_REQUIRED=false
```

**生成JWT_SECRET的方法**：
```bash
# 在服务器上执行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 将输出的字符串复制到JWT_SECRET
```

### 3.4 导入数据库结构

```bash
cd /var/www/livehup

# 导入主结构
mysql -u livepoints -p live_points < database/schema.sql

# 如果使用MySQL 5.6，改用：
# mysql -u livepoints -p live_points < database/schema-mysql56.sql

# 导入系统配置
mysql -u livepoints -p live_points < database/add_system_settings.sql

# 导入用户密码字段
mysql -u livepoints -p live_points < database/add_user_passwords.sql
```

### 3.5 安装依赖并启动后端

```bash
cd /var/www/livehup/backend

# 安装依赖（只安装生产环境依赖）
npm install --production

# 创建必要目录
mkdir -p uploads/products logs

# 创建管理员账号
node create-admin.js
# 按提示输入管理员信息（用户名、密码、邮箱）

# 使用PM2启动后端（限制内存500M）
pm2 start src/app.js --name livehup-backend --max-memory-restart 500M

# 查看运行状态
pm2 status

# 查看日志（确认启动成功）
pm2 logs livehup-backend --lines 20

# 设置开机自启
pm2 save
pm2 startup
# 复制输出的命令并执行
```

**验证后端是否正常运行**：
```bash
curl http://localhost:3000/health
# 应返回：{"status":"ok"}
```

---

## 四、前端部署 - 方案一（本地构建）✅推荐

### 4.1 在本地电脑安装Node.js

如果本地没有Node.js，访问 https://nodejs.org/ 下载并安装LTS版本。

### 4.2 在本地构建Admin管理端

```bash
# 在本地项目目录执行
cd admin

# 创建生产环境配置
# Windows用户用记事本创建 .env.production 文件
# Mac/Linux用户执行：
echo "REACT_APP_API_URL=http://你的服务器IP/api" > .env.production

# 安装依赖
npm install

# 构建项目
npm run build
```

**如果构建时内存不足**：
```bash
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Mac/Linux
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

构建成功后会生成 `build` 文件夹。

### 4.3 在本地构建Mobile移动端

```bash
# 返回项目根目录
cd ../mobile

# 创建生产环境配置
echo "REACT_APP_API_URL=http://你的服务器IP/api" > .env.production

# 安装依赖
npm install

# 构建项目
npm run build
```

### 4.4 上传构建产物到服务器

**方法A：使用FTP工具（推荐）**

1. 打开FileZilla或WinSCP
2. 连接到服务器
3. 上传 `admin/build` 文件夹到 `/var/www/livehup/admin/`
4. 上传 `mobile/build` 文件夹到 `/var/www/livehup/mobile/`

**方法B：使用SCP命令**

```bash
# 在本地项目目录执行
# 打包构建产物
tar -czf admin-build.tar.gz admin/build
tar -czf mobile-build.tar.gz mobile/build

# 上传到服务器
scp admin-build.tar.gz root@你的服务器IP:/tmp/
scp mobile-build.tar.gz root@你的服务器IP:/tmp/

# 在服务器上解压
ssh root@你的服务器IP
cd /var/www/livehup
mkdir -p admin mobile
tar -xzf /tmp/admin-build.tar.gz -C admin --strip-components=1
tar -xzf /tmp/mobile-build.tar.gz -C mobile --strip-components=1
rm /tmp/admin-build.tar.gz /tmp/mobile-build.tar.gz
```

### 4.5 设置文件权限

```bash
# 在服务器上执行
cd /var/www/livehup
sudo chown -R www-data:www-data admin/build mobile/build
sudo chmod -R 755 admin/build mobile/build
```

**完成！跳转到第六章配置Nginx。**

---

## 五、前端部署 - 方案二（服务器构建）

⚠️ **此方案需要先配置Swap虚拟内存，否则构建会失败！**

### 5.1 配置Swap虚拟内存

```bash
# 检查是否已有swap
free -h

# 创建4G swap文件（构建需要）
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 验证swap已启用
free -h
# 应该看到Swap行有4G

# 永久启用（重启后自动挂载）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 优化swap使用策略
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 5.2 上传完整前端代码

```bash
# 使用FTP或SCP上传 admin 和 mobile 文件夹到 /var/www/livehup/
# 确保上传了 package.json 和 src 等所有文件
```

### 5.3 构建Admin管理端

```bash
cd /var/www/livehup/admin

# 创建环境配置
echo "REACT_APP_API_URL=http://你的服务器IP/api" > .env.production

# 安装依赖
npm install

# 限制内存并构建
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 构建完成后删除node_modules释放空间
rm -rf node_modules
```

### 5.4 构建Mobile移动端

```bash
cd /var/www/livehup/mobile

# 创建环境配置
echo "REACT_APP_API_URL=http://你的服务器IP/api" > .env.production

# 安装依赖
npm install

# 限制内存并构建
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 构建完成后删除node_modules释放空间
rm -rf node_modules
```

### 5.5 设置文件权限

```bash
cd /var/www/livehup
sudo chown -R www-data:www-data admin/build mobile/build
sudo chmod -R 755 admin/build mobile/build
```

### 5.6 （可选）构建完成后减小Swap

```bash
# 如果不再需要大swap，可以改为2G
sudo swapoff /swapfile
sudo rm /swapfile
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 六、Nginx配置

### 6.1 创建Nginx配置文件

```bash
sudo nano /etc/nginx/sites-available/livehup
```

粘贴以下配置（**记得修改server_name为你的IP或域名**）：

```nginx
# 后端API服务
upstream backend_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

# PC管理端
server {
    listen 80;
    server_name 你的服务器IP;  # 修改为你的IP或域名
    
    root /var/www/livehup/admin/build;
    index index.html;
    
    # 启用gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 上传文件访问
    location /uploads/ {
        alias /var/www/livehup/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # React路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 移动端（如果需要单独域名）
server {
    listen 3001;  # 使用不同端口
    server_name 你的服务器IP;
    
    root /var/www/livehup/mobile/build;
    index index.html;
    
    # 启用gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 上传文件访问
    location /uploads/ {
        alias /var/www/livehup/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # React路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 6.2 启用配置并测试

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/livehup /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 如果显示 "syntax is ok" 和 "test is successful"，则重启Nginx
sudo systemctl restart nginx
```

### 6.3 配置防火墙

```bash
# 开放必要端口
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 3001/tcp   # 移动端端口
sudo ufw allow 443/tcp    # HTTPS（如果需要）

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 七、其他配置

### 7.1 MySQL内存优化

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

在 `[mysqld]` 部分添加：

```ini
[mysqld]
# 针对2G内存优化
innodb_buffer_pool_size = 256M
max_connections = 50
query_cache_size = 16M
query_cache_limit = 1M
thread_cache_size = 8
table_open_cache = 256
```

重启MySQL：

```bash
sudo systemctl restart mysql
```

### 7.2 配置日志轮转

```bash
sudo nano /etc/logrotate.d/livehup
```

添加：

```
/var/www/livehup/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    create 0644 www-data www-data
}
```

### 7.3 设置定时备份

```bash
# 创建备份脚本
sudo nano /var/www/livehup/backup.sh
```

添加内容：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/livehup"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u livepoints -p你的数据库密码 live_points | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/livehup/backend/uploads

# 删除7天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# 设置执行权限
sudo chmod +x /var/www/livehup/backup.sh

# 添加定时任务（每天凌晨2点备份）
crontab -e
# 添加这一行：
# 0 2 * * * /var/www/livehup/backup.sh >> /var/log/livehup-backup.log 2>&1
```

---

## 八、访问系统

部署完成后，通过以下地址访问：

- **PC管理端**: http://你的服务器IP
- **移动端**: http://你的服务器IP:3001
- **API健康检查**: http://你的服务器IP/api/health

默认管理员账号：
- 用户名：通过 `create-admin.js` 创建时设置
- 密码：通过 `create-admin.js` 创建时设置

---

## 九、常用维护命令

### 查看服务状态

```bash
# 查看PM2进程
pm2 status
pm2 logs livehup-backend

# 查看Nginx状态
sudo systemctl status nginx

# 查看MySQL状态
sudo systemctl status mysql

# 查看内存使用
free -h
pm2 monit
```

### 重启服务

```bash
# 重启后端
pm2 restart livehup-backend

# 重启Nginx
sudo systemctl restart nginx

# 重启MySQL
sudo systemctl restart mysql
```

### 查看日志

```bash
# 后端日志
tail -f /var/www/livehup/backend/logs/combined.log
tail -f /var/www/livehup/backend/logs/error.log

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PM2日志
pm2 logs livehup-backend --lines 100
```

---

## 十、故障排查

### 问题1：构建时内存不足

**症状**：`FATAL ERROR: Ineffective mark-compacts near heap limit`

**解决方案**：
- 方案一：使用本地构建（推荐）
- 方案二：配置4G Swap后再构建

### 问题2：后端无法启动

```bash
# 检查端口占用
sudo netstat -tlnp | grep 3000

# 检查数据库连接
mysql -u livepoints -p live_points -e "SELECT 1"

# 查看详细日志
pm2 logs livehup-backend --lines 50
```

### 问题3：前端页面无法访问

```bash
# 检查Nginx配置
sudo nginx -t

# 检查文件是否存在
ls -la /var/www/livehup/admin/build
ls -la /var/www/livehup/mobile/build

# 修复权限
sudo chown -R www-data:www-data /var/www/livehup
```

### 问题4：API请求失败

检查 `.env.production` 文件中的 `REACT_APP_API_URL` 是否正确：
- 应该是：`http://你的服务器IP/api`
- 不是：`http://localhost:3000/api`

---

## 十一、安全建议

1. **修改SSH端口**：避免使用默认22端口
2. **禁用root登录**：创建普通用户使用sudo
3. **使用强密码**：数据库、管理员账号都要用强密码
4. **定期备份**：每天自动备份数据库
5. **更新系统**：定期执行 `sudo apt update && sudo apt upgrade`
6. **配置HTTPS**：使用Let's Encrypt免费证书

---

## 十二、配置HTTPS（可选）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动配置SSL（需要域名）
sudo certbot --nginx -d your-domain.com -d m.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

---

**部署完成！** 

如有问题，请检查：
1. PM2进程是否正常运行：`pm2 status`
2. Nginx配置是否正确：`sudo nginx -t`
3. 数据库是否可连接：`mysql -u livepoints -p live_points -e "SELECT 1"`
4. 防火墙端口是否开放：`sudo ufw status`