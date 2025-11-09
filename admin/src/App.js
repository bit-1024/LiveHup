import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, message } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  SettingOutlined,
  UserOutlined,
  ShopOutlined,
  SwapOutlined,
  QrcodeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ControlOutlined,
} from '@ant-design/icons';

// 组件
import Logo from './components/Logo';

// 页面组件
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataImport from './pages/DataImport';
import RulesConfig from './pages/RulesConfig';
import UserManagement from './pages/UserManagement';
import ProductManagement from './pages/ProductManagement';
import ExchangeManagement from './pages/ExchangeManagement';
import QRCodePage from './pages/QRCodePage';
import SystemSettings from './pages/SystemSettings';

const { Header, Sider, Content } = Layout;

// 菜单配置
const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/import',
    icon: <UploadOutlined />,
    label: '数据导入',
  },
  {
    key: '/rules',
    icon: <SettingOutlined />,
    label: '积分规则',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
  },
  {
    key: '/products',
    icon: <ShopOutlined />,
    label: '商品管理',
  },
  {
    key: '/exchanges',
    icon: <SwapOutlined />,
    label: '兑换管理',
  },
  {
    key: '/qrcode',
    icon: <QrcodeOutlined />,
    label: '二维码',
  },
  {
    key: '/settings',
    icon: <ControlOutlined />,
    label: '系统设置',
  },
];

function App() {
  const [collapsed, setCollapsed] = useState(window.innerWidth <= 768);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('userInfo');
    
    if (token && user) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(user));
    }
    setLoading(false);

    // 监听窗口大小变化
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setIsAuthenticated(false);
    setUserInfo(null);
    message.success('退出登录成功');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div>加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={<Login onLogin={setIsAuthenticated} onUserInfo={setUserInfo} />} 
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout className="layout-container">
        {!collapsed && window.innerWidth <= 768 && (
          <div
            className="sidebar-mask"
            onClick={() => setCollapsed(true)}
          />
        )}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="layout-sider"
          width={240}
        >
          <Logo collapsed={collapsed} />
          <Menu
            theme="light"
            mode="inline"
            defaultSelectedKeys={['/dashboard']}
            items={menuItems}
            onClick={({ key }) => {
              if (window.innerWidth <= 768) {
                setCollapsed(true);
              }
              window.location.pathname = key;
            }}
            selectedKeys={[window.location.pathname]}
          />
        </Sider>
        
        <Layout>
          <Header className="layout-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 16, width: 40, height: 40 }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#8c8c8c' }}>
                欢迎，{userInfo?.real_name || userInfo?.username}
              </span>
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Avatar 
                  style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
                  icon={<UserOutlined />}
                />
              </Dropdown>
            </div>
          </Header>
          
          <Content className="layout-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/import" element={<DataImport />} />
              <Route path="/rules" element={<RulesConfig />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/exchanges" element={<ExchangeManagement />} />
              <Route path="/qrcode" element={<QRCodePage />} />
              <Route path="/settings" element={<SystemSettings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;