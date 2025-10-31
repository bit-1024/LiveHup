const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const logger = require('../config/logger');

// 生成二维码
router.get('/generate', async (req, res) => {
  try {
    const { url, userId } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '请提供URL参数'
      });
    }

    // 生成查询链接
    const queryUrl = userId 
      ? `${url}?userId=${userId}`
      : url;

    // 生成二维码
    const qrCodeDataURL = await QRCode.toDataURL(queryUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300
    });

    res.json({
      success: true,
      data: {
        url: queryUrl,
        qrCode: qrCodeDataURL
      }
    });
  } catch (error) {
    logger.error('生成二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
});

module.exports = router;