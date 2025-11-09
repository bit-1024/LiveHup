const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/exchanges/export', {
      responseType: 'arraybuffer',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImlhdCI6MTc2MjY4MDA3MCwiZXhwIjoxNzYzMjg0ODcwfQ.goPDUJZ1fpusj8kxEQI5ZUG3-8YPx0AlXVIPrjDuo6M'
      }
    });
    console.log('status', res.status);
    console.log('type', res.headers['content-type']);
    console.log('length', res.data.byteLength);
  } catch (err) {
    console.error('error', err.response?.status, err.response?.data?.toString());
  }
})();
