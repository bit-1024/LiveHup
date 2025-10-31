const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const importController = require('../controllers/importController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.xlsx,.xls,.csv').split(',');
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}，仅支持 ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 默认10MB
  }
});

// 上传并导入文件
router.post('/upload', authMiddleware, requireAdmin, upload.single('file'), importController.importFile);

// 获取导入历史
router.get('/history', authMiddleware, importController.getImportHistory);

// 获取导入详情
router.get('/detail/:batchId', authMiddleware, importController.getImportDetail);

// 下载导入模板
router.get('/template', importController.downloadTemplate);

module.exports = router;