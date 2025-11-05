const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const productsController = require('../controllers/productsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 图片上传目录配置
const uploadsRoot = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.resolve(__dirname, '../../uploads');

const productUploadDir = process.env.PRODUCT_IMAGE_UPLOAD_PATH
  ? path.resolve(process.env.PRODUCT_IMAGE_UPLOAD_PATH)
  : path.join(uploadsRoot, 'products');

if (!fs.existsSync(productUploadDir)) {
  fs.mkdirSync(productUploadDir, { recursive: true });
}

const allowedExtensions = (process.env.PRODUCT_IMAGE_ALLOWED_TYPES || '.jpg,.jpeg,.png,.gif,.webp')
  .toLowerCase()
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    cb(new Error(`不支持的文件类型: ${ext}，允许类型: ${allowedExtensions.join(', ')}`));
    return;
  }
  cb(null, true);
};

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: parseInt(process.env.PRODUCT_IMAGE_MAX_SIZE, 10) || 2 * 1024 * 1024
  }
});

// 获取商品列表（所有终端可见）
router.get('/', productsController.getProducts);

// 获取商品分类
router.get('/categories', productsController.getCategories);

// 获取商品统计（管理员）
router.get('/stats', authMiddleware, productsController.getProductStats);

// 获取商品详情
router.get('/:id', productsController.getProductById);

// 创建商品（管理员）
router.post('/', authMiddleware, requireAdmin, productsController.createProduct);

// 更新商品（管理员）
router.put('/:id', authMiddleware, requireAdmin, productsController.updateProduct);

// 切换商品上下架状态（管理员）
router.put('/:id/toggle', authMiddleware, requireAdmin, productsController.updateProduct);

// 删除商品（管理员）
router.delete('/:id', authMiddleware, requireAdmin, productsController.deleteProduct);

// 批量上下架（管理员）
router.post('/batch/toggle', authMiddleware, requireAdmin, productsController.batchToggleProducts);

// 商品图片上传（管理员）
router.post('/upload', authMiddleware, requireAdmin, imageUpload.single('file'), productsController.uploadProductImage);

module.exports = router;
