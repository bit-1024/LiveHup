const http = require('http');
const fs = require('fs');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, data: body });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testExport() {
  try {
    // 先登录
    const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, loginData);
    
    const token = JSON.parse(loginRes.data.toString()).token;
    console.log('登录成功');
    
    // 测试导出
    const exportRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/exchanges/export',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('导出状态:', exportRes.status);
    console.log('数据大小:', exportRes.data.length);
    
    fs.writeFileSync('test_export_result.xlsx', exportRes.data);
    console.log('文件已保存');
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testExport();