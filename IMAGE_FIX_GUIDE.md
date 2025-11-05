# 商品图片显示问题修复指南

## 问题描述
商品管理页中上传商品文件后，图片无法预览，移动端也无法看到图片。

## 根本原因
1. 后端缺少 `FILE_BASE_URL` 配置，导致图片URL构建不完整
2. 前端图片组件没有正确处理图片URL

## 修复内容

### 1. 后端配置修复 (`backend/.env`)
添加了以下配置：
```env
FILE_BASE_URL=http://localhost:3000

# 商品图片上传配置
PRODUCT_IMAGE_UPLOAD_PATH=./uploads/products
PRODUCT_IMAGE_MAX_SIZE=2097152
PRODUCT_IMAGE_ALLOWED_TYPES=.jpg,.jpeg,.png,.gif,.webp
```

### 2. 管理后台修复 (`admin/src/pages/ProductManagement.js`)
- 优化了表格中图片列的渲染逻辑
- 添加了图片预览功能
- 改进了图片URL的处理

## 验证步骤

### 1. 重启后端服务
```bash
cd backend
npm start
```

### 2. 测试管理后台
1. 访问管理后台：http://localhost:3001
2. 登录后进入"商品管理"页面
3. 点击"新增商品"
4. 上传商品图片
5. 保存后查看商品列表中的图片是否正常显示
6. 点击图片可以预览大图

### 3. 测试移动端
1. 访问移动端：http://localhost:3002
2. 进入"积分商城"页面
3. 查看商品列表中的图片是否正常显示
4. 点击商品进入详情页
5. 查看商品详情页的图片是否正常显示

## 技术说明

### 图片URL处理流程
1. **上传阶段**：
   - 前端上传图片到 `/api/products/upload`
   - 后端保存到 `uploads/products/` 目录
   - 返回相对路径：`/uploads/products/file-xxx.png`

2. **存储阶段**：
   - 数据库存储相对路径：`/uploads/products/file-xxx.png`

3. **读取阶段**：
   - 后端API返回时使用 `buildFileUrl()` 转换为完整URL
   - 完整URL格式：`http://localhost:3000/uploads/products/file-xxx.png`

4. **显示阶段**：
   - 前端直接使用完整URL显示图片
   - 静态文件服务：`app.use('/uploads', express.static(...))`

## 注意事项

1. **生产环境配置**：
   - 需要将 `FILE_BASE_URL` 改为实际的域名
   - 例如：`FILE_BASE_URL=https://yourdomain.com`

2. **图片访问权限**：
   - 确保 `uploads/products/` 目录有读写权限
   - 确保静态文件服务正常工作

3. **跨域问题**：
   - 如果前后端分离部署，需要配置CORS
   - 已在 `backend/src/app.js` 中配置

## 故障排查

### 图片仍然无法显示
1. 检查浏览器控制台是否有404错误
2. 检查图片URL是否正确：应该是完整的HTTP URL
3. 检查后端 `uploads/products/` 目录是否存在图片文件
4. 检查 `.env` 文件中的 `FILE_BASE_URL` 配置

### 上传失败
1. 检查文件大小是否超过限制（默认2MB）
2. 检查文件格式是否支持（jpg, jpeg, png, gif, webp）
3. 检查 `uploads/products/` 目录权限

## 相关文件
- `backend/.env` - 环境配置
- `backend/src/app.js` - 静态文件服务
- `backend/src/controllers/productsController.js` - 商品控制器
- `backend/src/routes/products.js` - 商品路由
- `backend/src/utils/file.js` - 文件工具函数
- `admin/src/pages/ProductManagement.js` - 管理后台商品页面
- `mobile/src/pages/Shop.js` - 移动端商城页面
- `mobile/src/pages/ProductDetail.js` - 移动端商品详情页