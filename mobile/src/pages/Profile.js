import React from 'react';
import { NavBar, Cell, Button, Dialog } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Dialog.confirm({
      title: '提示',
      message: '确认要退出登录吗？',
    }).then(() => {
      logout();
      navigate('/login', { replace: true });
    }).catch(() => {});
  };

  return (
    <div className="page-container">
      <NavBar 
        title="个人中心" 
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 个人信息卡片 */}
        <div className="card" style={{ padding: '24px 16px', marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'var(--primary-color-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
              }}>
                <Icon name="user-o" size={32} color="var(--primary-color)" />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: 4, color: 'var(--text-color)' }}>
                  {user?.username || user?.user_id || '匿名用户'}
                </div>
                <div style={{ fontSize: 15, color: 'var(--text-color-secondary)' }}>
                  ID: {user?.user_id || '-'}
                </div>
              </div>
            </div>
            <Button
              size="small"
              round
              type="default"
              onClick={handleLogout}
            >
              退出
            </Button>
          </div>
        </div>

        {/* 功能入口 */}
        <div className="card">
          <div className="card-header">常用功能</div>
          <Cell.Group inset={false}>
            <Cell
              title="查看积分"
              label="查看当前账号积分明细"
              icon={<Icon name="point-gift-o" color="#007AFF" />}
              isLink
              onClick={() => navigate('/points-details')}
            />
            <Cell
              title="兑换记录"
              label="查看当前账号的兑换记录"
              icon={<Icon name="orders-o" color="#007AFF" />}
              isLink
              onClick={() => navigate('/exchange-record')}
            />
            <Cell
              title="修改密码"
              label="修改登录密码"
              icon={<Icon name="setting-o" color="#007AFF" />}
              isLink
              onClick={() => navigate('/change-password')}
            />
          </Cell.Group>
        </div>
      </div>
    </div>
  );
};

export default Profile;
