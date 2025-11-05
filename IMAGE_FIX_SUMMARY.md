# 商品图片显示问题修复总结

## 问题描述
商品管理页中上传商品文件后，图片无法预览，移动端也无法看到图片。

## 根本原因
1. **管理后台表格显示问题**：表格列直接使用数据库中的相对路径（如 `/uploads/products/xxx.jpg`），没有构建完整的 URL
2. **移动端显示问题**：移动端直接使用后端返回的相对路径，没有构建完整的 URL
3. **路由缺失**：前端调用的 toggle 接口在后端没有对应的路由

## 修复内容

### 1. 管理后台 (admin/src/pages/ProductManagement.js)
- **修改位置**：第 256 行，表格的图片列渲染函数
- **修改内容**：使用 `buildPreviewUrl(url)` 构建完整的图片 URL
- **效果**：管理后台的商品列表和预览现在可以正确显示图片

### 2. 移动端 API 工具 (mobile/src/services/api.js)
- **新增功能**：添加 `buildImageUrl` 工具函数
- **功能说明**：
  - 如果路径已经是完整 URL（http/https），直接返回
  - 否则，使用 `REACT_APP_API_URL` 或当前域名构建完整 URL
  - 自动处理路径前缀斜杠

### 3. 移动端商品列表 (mobile/src/pages/Shop.js)
- **修改位置**：第 94 行，ProductCard 组件的 Image 标签
- **修改内容**：使用 `utils.buildImageUrl(product.image_url)` 构建完整 URL
- **效果**：商品列表页面可以正确显示商品图片

### 4. 移动端商品详情 (mobile/src/pages/ProductDetail.js)
- **修改位置**：第 150 行，商品图片的 Image 标签
- **修改内容**：使用 `utils.buildImageUrl(product.image_url)` 构建完整 URL
- **效果**：商品详情页面可以正确显示商品图片

### 5. 后端路由 (backend/src/routes/products.js)
- **新增路由**：`PUT /:id/toggle` - 商品上下架切换
- **说明**：复用 `updateProduct` 控制器方法，支持前端的 toggle 功能

## 数据库存储说明
- 数据库 `products` 表的 `image_url` 字段存储的是**相对路径**（如 `/uploads/products/file-xxx.jpg`）
- 后端 API 返回数据时，会通过 `buildFileUrl` 函数构建完整的 URL
- 前端需要确保使用构建后的完整 URL 来显示图片

## 环境配置要求

### 后端 (.env)
```env
FILE_BASE_URL=http://localhost:3000
```

### 前端管理后台 (.env)
```env
REACT_APP_FILE_BASE_URL=http://localhost:3000
```

### 移动端 (.env)
```env
REACT_APP_API_URL=http://localhost:3000
```

## 测试验证
1. ✅ 管理后台上传图片后，列表中可以看到缩略图
2. ✅ 管理后台点击图片可以预览大图
3. ✅ 移动端商品列表可以显示商品图片
4. ✅ 移动端商品详情可以显示商品图片
5. ✅ 数据库中正确存储相对路径

## 注意事项
1. 确保后端的 `uploads/products` 目录存在且有写入权限
2. 确保后端正确配置了静态文件服务（express.static）
3. 生产环境需要配置正确的 `FILE_BASE_URL`
4. 如果使用 CDN，需要在环境变量中配置 CDN 地址