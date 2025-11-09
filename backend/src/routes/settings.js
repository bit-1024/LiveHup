const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/database');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings WHERE id = 1');
    res.json(rows[0] || { system_name: '社群直播积分系统', logo_url: null });
  } catch (error) {
    res.status(500).json({ message: '获取设置失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { system_name, logo_url } = req.body;
    await db.query(
      'INSERT INTO system_settings (id, system_name, logo_url) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE system_name = ?, logo_url = ?',
      [system_name, logo_url, system_name, logo_url]
    );
    res.json({ message: '设置保存成功' });
  } catch (error) {
    res.status(500).json({ message: '保存设置失败' });
  }
});

module.exports = router;