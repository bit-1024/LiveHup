import React from 'react';
import { NavBar, Cell, Button } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

const Profile = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: '积分查询',
      icon: <Icon name="point-gift-o" color="#007AFF" />,
      path: '/points-query',
      desc: '查询个人积分余额和明细'
    },
    {
      title: '兑换记录',
      icon: <Icon name="orders-o" color="#007AFF" />,
      path: '/exchange-record',
      desc: '查看历史兑换记录'
    }
  ];

  const helpItems = [
    {
      title: '使用帮助',
      icon: <Icon name="question-o" color="#8E8E93" />,
      path: '/help'
    },
    {
      title: '联系客服',
      icon: <Icon name="service-o" color="#8E8E93" />,
      path: '/contact'
    },
    {
      title: '关于我们',
      icon: <Icon name="info-o" color="#8E8E93" />,
      path: '/about'
    }
  ];

  return (
    <div className="page-container">
      <NavBar 
        title="个人中心" 
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 用户信息卡片 */}
        <div className="card" style={{
          background: '#007AFF',
          color: 'white',
          padding: '24px 16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '28px'
            }}>
              <Icon name="user-o" />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>
                积分用户
              </div>
              <div style={{ fontSize: '15px', opacity: 0.9 }}>
                欢迎使用积分系统
              </div>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '15px', opacity: 0.9, marginBottom: '8px' }}>
              查询积分请输入您的用户ID
            </div>
            <Button
              size="small"
              round
              style={{
                background: 'white',
                border: 'none',
                color: '#007AFF',
                fontWeight: '500'
              }}
              onClick={() => navigate('/points-query')}
            >
              立即查询
            </Button>
          </div>
        </div>

        {/* 主要功能 */}
        <div className="card">
          <div className="card-header">主要功能</div>
          <Cell.Group inset={false}>
            {menuItems.map((item, index) => (
              <Cell
                key={index}
                title={item.title}
                label={item.desc}
                icon={item.icon}
                isLink
                onClick={() => navigate(item.path)}
              />
            ))}
          </Cell.Group>
        </div>

        {/* 帮助与支持 */}
        <div className="card">
          <div className="card-header">帮助与支持</div>
          <Cell.Group inset={false}>
            {helpItems.map((item, index) => (
              <Cell
                key={index}
                title={item.title}
                icon={item.icon}
                isLink
                onClick={() => {
                  if (item.path === '/contact') {
                    // 这里可以实现联系客服功能
                    // 比如打开微信客服、拨打电话等
                    window.location.href = 'tel:400-123-4567';
                  } else if (item.path === '/help') {
                    // 显示帮助信息
                    navigate('/help');
                  } else if (item.path === '/about') {
                    // 显示关于信息
                    navigate('/about');
                  }
                }}
              />
            ))}
          </Cell.Group>
        </div>

        {/* 系统信息 */}
        <div className="card">
          <div className="card-header">系统信息</div>
          <Cell.Group inset={false}>
            <Cell title="当前版本" value="v1.0.0" />
            <Cell title="更新时间" value="2024-01-01" />
          </Cell.Group>
        </div>

        {/* 底部安全区域 */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default Profile;
