# 社群直播数据积分管理系统

一个完整的积分管理系统，包含后端API、PC管理端和移动端H5页面。

## 系统架构

- **Backend**: Node.js + Express + MySQL
- **Admin**: React + Ant Design (PC管理端)
- **Mobile**: React + React Vant (移动端H5)

## 功能特性

### 管理端
- 用户管理：查看用户积分、积分记录
- 数据导入：Excel批量导入用户数据
- 积分规则：配置积分计算规则
- 商品管理：管理可兑换商品
- 兑换管理：处理用户兑换订单
- 系统设置：配置系统参数

### 移动端
- 用户登录：手机号登录
- 积分查询：查看当前积分和历史记录
- 商品兑换：浏览商品并兑换
- 兑换记录：查看兑换历史
- 个人中心：管理个人信息

## 部署方式

### 方式一：Docker 部署（推荐）

**优势**：
- ✅ 5-10分钟快速部署
- ✅ 环境完全一致
- ✅ 一键启动所有服务
- ✅ 易于维护和更新

详细步骤请查看：[Docker 部署指南](DOCKER_DEPLOYMENT.md)

**快速开始**：

```bash
# 1. 配置环境变量
cp .env.example .env
nano .env  # 修改数据库密码、JWT密钥等

# 2. 启动所有服务
docker compose up -d

# 3. 创建管理员账号
docker compose exec backend node create-admin.js

# 4. 访问系统
# PC管理端: http://your-server-ip:80
# 移动端: http://your-server-ip:8080
# API: http://your-server-ip:3000
```

### 方式二：传统部署

适合需要更多自定义配置的场景。

详细步骤请查看：[传统部署指南](DEPLOYMENT.md)

## 服务器要求

- **最低配置**：2核2G
- **推荐配置**：2核4G 或更高
- **操作系统**：Ubuntu 20.04+ / CentOS 7+ / Debian 10+

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 3306 | 数据库 |
| Backend API | 3000 | 后端接口 |
| Admin (Docker) | 80 | PC管理端 |
| Mobile (Docker) | 8080 | 移动端 |
| Nginx (可选) | 8888 | 统一入口 |

## 目录结构

```
LiveHup/
├── backend/              # 后端服务
│   ├── src/             # 源代码
│   ├── uploads/         # 上传文件
│   ├── logs/            # 日志文件
│   └── Dockerfile       # Docker配置
├── admin/               # PC管理端
│   ├── src/             # 源代码
│   ├── public/          # 静态资源
│   ├── nginx.conf       # Nginx配置
│   └── Dockerfile       # Docker配置
├── mobile/              # 移动端
│   ├── src/             # 源代码
│   ├── public/          # 静态资源
│   ├── nginx.conf       # Nginx配置
│   └── Dockerfile       # Docker配置
├── database/            # 数据库脚本
│   ├── schema.sql       # 数据库结构
│   └── *.sql            # 其他SQL脚本
├── nginx/               # Nginx配置（Docker）
├── docker-compose.yml   # Docker编排文件
├── .env.example         # 环境变量模板
├── DEPLOYMENT.md        # 传统部署指南
└── DOCKER_DEPLOYMENT.md # Docker部署指南
```

## 环境变量配置

复制 `.env.example` 为 `.env` 并修改以下关键配置：

```env
# 数据库密码（必须修改）
MYSQL_ROOT_PASSWORD=你的强密码
MYSQL_PASSWORD=你的数据库密码

# JWT密钥（必须修改，至少32位）
JWT_SECRET=你的超长随机密钥

# 域名配置
CORS_ORIGIN=http://your-domain.com
ADMIN_API_URL=http://your-domain.com/api
MOBILE_API_URL=http://your-domain.com/api
```

## 常用命令

### Docker 部署

```bash
# 启动服务
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 更新部署
docker compose up -d --build
```

### 传统部署

```bash
# 后端
cd backend
npm install
pm2 start src/app.js --name livehup-backend

# 前端构建
cd admin && npm install && npm run build
cd mobile && npm install && npm run build
```

## 数据备份

### Docker 环境

```bash
# 备份数据库
docker compose exec mysql mysqldump -u livepoints -p live_points > backup.sql

# 备份上传文件
docker compose exec backend tar -czf - /app/uploads > uploads_backup.tar.gz
```

### 传统环境

```bash
# 备份数据库
mysqldump -u livepoints -p live_points > backup.sql

# 备份上传文件
tar -czf uploads_backup.tar.gz /var/www/livehup/backend/uploads
```

## 故障排查

### 服务无法启动

```bash
# Docker环境
docker compose logs [service_name]
docker compose ps

# 传统环境
pm2 logs livehup-backend
sudo systemctl status nginx mysql
```

### 数据库连接失败

1. 检查数据库服务是否运行
2. 验证 `.env` 中的数据库配置
3. 确认数据库用户权限

### 内存不足

1. 配置 Swap 交换空间
2. 限制容器内存使用
3. 优化 MySQL 配置

详细排查步骤请参考部署文档。

## 技术栈

### 后端
- Node.js 16+
- Express 4.x
- MySQL 5.7+
- JWT 认证
- Multer 文件上传
- Winston 日志

### 前端
- React 18
- Ant Design 5 (Admin)
- React Vant 3 (Mobile)
- Axios
- React Router 6

### 部署
- Docker & Docker Compose
- Nginx
- PM2

## 开发环境

```bash
# 后端开发
cd backend
npm install
npm run dev

# 管理端开发
cd admin
npm install
npm start

# 移动端开发
cd mobile
npm install
npm start
```

## 许可证

MIT License

## 支持

如有问题，请查看：
- [Docker 部署指南](DOCKER_DEPLOYMENT.md)
- [传统部署指南](DEPLOYMENT.md)
- 或提交 Issue