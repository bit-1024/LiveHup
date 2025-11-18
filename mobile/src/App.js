import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabbar } from 'react-vant';
import Icon from './components/Icon';

import { AuthProvider, useAuth } from './context/AuthContext';

// 页面组件
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import PointsQuery from './pages/PointsQuery';
import ExchangeRecord from './pages/ExchangeRecord';
import ExchangeDetail from './pages/ExchangeDetail';
import QRScanner from './pages/QRScanner';
import Login from './pages/Login';

function AppContent() {
  const [activeTab, setActiveTab] = React.useState('home');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 需要隐藏底部导航的页面
  const hideTabbarPages = ['/product/', '/exchange/', '/points-query', '/qr-scanner'];
  const shouldHideTabbar = hideTabbarPages.some(page => location.pathname.includes(page));

  React.useEffect(() => {
    // 根据路径设置当前激活的tab
    if (location.pathname === '/' || location.pathname === '/home') {
      setActiveTab('home');
    } else if (location.pathname === '/shop') {
      setActiveTab('shop');
    } else if (location.pathname === '/profile') {
      setActiveTab('profile');
    }
  }, [location.pathname]);

  const handleTabChange = (name) => {
    setActiveTab(name);
    navigate(`/${name}`);
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="page-container">
      <Routes>
        <Route path="/login" element={<Navigate to="/home" replace />} />
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
          onChange={handleTabChange}
          fixed
          placeholder
          safeAreaInsetBottom
        >
          <Tabbar.Item
            name="home"
            icon={<Icon name="wap-home-o" size={24} />}
          >
            首页
          </Tabbar.Item>
          <Tabbar.Item
            name="shop"
            icon={<Icon name="shop-o" size={24} />}
          >
            积分商城
          </Tabbar.Item>
          <Tabbar.Item
            name="profile"
            icon={<Icon name="contact" size={24} />}
          >
            我的
          </Tabbar.Item>
        </Tabbar>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
