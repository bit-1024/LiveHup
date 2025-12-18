// {{CODE-Cycle-Integration:
//   Task_ID: [#T012]
//   Timestamp: 2025-12-17T01:58:48Z
//   Phase: D-Develop
//   Context-Analysis: "更新App.js，集成Zustand状态管理"
//   Principle_Applied: "State-Management, Clean-Architecture"
// }}
// {{START_MODIFICATIONS}}

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Spin } from 'antd';
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

// Store
import { useAuthStore, useAppStore, resetAllStores } from './store';

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

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 使用Zustand store
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setPageTitle } = useAppStore();

  // 根据路由设置页面标题
  useEffect(() => {
    const currentMenu = menuItems.find(item => item.key === location.pathname);
    if (currentMenu) {
      setPageTitle(currentMenu.label);
    }
  }, [location.pathname, setPageTitle]);

  const handleLogout = async () => {
    await logout();
    // 重置所有store状态
    resetAllStores();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="layout-container">
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        className="layout-sider"
        width={240}
      >
        <Logo collapsed={sidebarCollapsed} />
        <Menu
          theme="light"
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          selectedKeys={[location.pathname]}
        />
      </Sider>
      
      <Layout>
        <Header className="layout-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#8c8c8c' }}>
              欢迎，{user?.real_name || user?.username || '管理员'}
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
  );
}

function App() {
  // 使用Zustand store
  const { isAuthenticated, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    // 检查认证状态
    checkAuth();
  }, [checkAuth]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未认证，显示登录页
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // 已认证，显示主布局
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;

// {{END_MODIFICATIONS}}