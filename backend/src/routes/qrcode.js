const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const logger = require('../config/logger');

// 生成二维码
router.get('/generate', async (req, res) => {
  try {
    const { text, url, userId, size } = req.query;
    
    const content = text || url || 'http://localhost:3000/points-query';
    const qrSize = parseInt(size) || 300;

    // 生成查询链接
    const queryUrl = userId
      ? `${content}?userId=${userId}`
      : content;

    // 生成二维码
    const qrCodeDataURL = await QRCode.toDataURL(queryUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: qrSize
    });

    res.json({
      success: true,
      data: {
        url: queryUrl,
        qrcode: qrCodeDataURL
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