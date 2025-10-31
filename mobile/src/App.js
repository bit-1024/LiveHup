import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Tabbar, TabbarItem } from 'vant';
import { 
  HomeO, 
  ShopO, 
  UserO,
  PointGiftO
} from '@vant/icons';

// 页面组件
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import PointsQuery from './pages/PointsQuery';
import ExchangeRecord from './pages/ExchangeRecord';
import ExchangeDetail from './pages/ExchangeDetail';
import QRScanner from './pages/QRScanner';

function App() {
  const [activeTab, setActiveTab] = React.useState('home');
  const location = window.location.pathname;

  // 需要隐藏底部导航的页面
  const hideTabbarPages = ['/product/', '/exchange/', '/points-query', '/qr-scanner'];
  const shouldHideTabbar = hideTabbarPages.some(page => location.includes(page));

  React.useEffect(() => {
    // 根据路径设置当前激活的tab
    if (location === '/' || location === '/home') {
      setActiveTab('home');
    } else if (location === '/shop') {
      setActiveTab('shop');
    } else if (location === '/profile') {
      setActiveTab('profile');
    }
  }, [location]);

  return (
    <Router>
      <div className="page-container">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/points-query" element={<PointsQuery />} />
          <Route path="/exchange-record" element={<ExchangeRecord />} />
          <Route path="/exchange/:id" element={<ExchangeDetail />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>

        {/* 底部导航 */}
        {!shouldHideTabbar && (
          <Tabbar 
            value={activeTab} 
            onChange={setActiveTab}
            fixed
            placeholder
            safeAreaInsetBottom
          >
            <TabbarItem 
              name="home" 
              icon={<HomeO />}
              to="/home"
            >
              首页
            </TabbarItem>
            <TabbarItem 
              name="shop" 
              icon={<ShopO />}
              to="/shop"
            >
              积分商城
            </TabbarItem>
            <TabbarItem 
              name="profile" 
              icon={<UserO />}
              to="/profile"
            >
              我的
            </TabbarItem>
          </Tabbar>
        )}
      </div>
    </Router>
  );
}

export default App;