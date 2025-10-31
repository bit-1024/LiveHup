import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'vant';
import zhCN from 'vant/es/locale/lang/zh-CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'vant/lib/index.css';
import App from './App';
import './index.css';

// 设置dayjs中文
dayjs.locale('zh-cn');

// 设置根字体大小（用于rem适配）
function setRootFontSize() {
  const width = document.documentElement.clientWidth;
  const fontSize = Math.min(width / 375 * 16, 20); // 基于375px设计稿，最大20px
  document.documentElement.style.fontSize = fontSize + 'px';
}

setRootFontSize();
window.addEventListener('resize', setRootFontSize);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);