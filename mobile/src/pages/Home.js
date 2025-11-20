import React, { useState, useEffect } from 'react';
import { NavBar, Cell, Grid, Toast } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { authAPI, utils } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await authAPI.getSummary();
        setUserInfo(response?.data?.user || null);
      } catch (error) {
        Toast.fail('获取积分信息失败');
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  const quickActions = [
    {
      icon: 'point-gift-o',
      text: '积分明细',
      color: '#007AFF',
      path: '/points-details'
    },
    {
      icon: 'shop-o',
      text: '积分商城',
      color: '#007AFF',
      path: '/shop'
    },
    {
      icon: 'orders-o',
      text: '兑换记录',
      color: '#007AFF',
      path: '/exchange-record'
    }
  ];

  const handleQuickAction = (path) => {
    navigate(path);
  };

  return (
    <div className="page-container">
      <NavBar
        title="积分系统"
        fixed
        placeholder
      />
      
      <div className="page-content">
        {/* 用户积分卡片 */}
        <div className="card">
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                你好，{userInfo?.username || user?.user_id || '用户'}
              </div>
              <div style={{ fontSize: 14, color: '#8e8e93' }}>
                欢迎回来，查看你的积分情况
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 100%)',
              borderRadius: 12,
              padding: '20px 16px',
              marginBottom: 16,
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                zIndex: 1
              }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 6 }}>可用积分</div>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px' }}>
                  {loading ? '-' : utils.formatNumber(userInfo?.available_points || 0)}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                flex: 1,
                background: '#f2f2f7',
                borderRadius: 12,
                padding: '16px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginBottom: 6 }}>累计获得</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-color)' }}>
                  {loading ? '-' : utils.formatNumber(userInfo?.total_points || 0)}
                </div>
              </div>
              <div style={{
                flex: 1,
                background: '#f2f2f7',
                borderRadius: 12,
                padding: '16px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginBottom: 6 }}>已使用</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-color)' }}>
                  {loading ? '-' : utils.formatNumber(userInfo?.used_points || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="card">
          <div className="card-header">快捷操作</div>
          <Grid columnNum={3} gutter={16} style={{ padding: '16px' }}>
            {quickActions.map((action, index) => (
              <Grid.Item
                key={index}
                onClick={() => handleQuickAction(action.path)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  <Icon
                    name={action.icon}
                    size="32px"
                    color={action.color}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{
                    fontSize: '14px',
                    color: '#323233'
                  }}>
                    {action.text}
                  </div>
                </div>
              </Grid.Item>
            ))}
          </Grid>
        </div>

        {/* 功能介绍 */}
        <div className="card">
          <div className="card-header">功能介绍</div>
          <Cell.Group inset={false}>
            <Cell
              title="积分明细"
              label="查看个人积分余额和明细"
              icon={<Icon name="point-gift-o" />}
              isLink
              onClick={() => navigate('/points-details')}
            />
            <Cell
              title="积分商城"
              label="使用积分兑换心仪商品，享受专属优惠"
              icon={<Icon name="shop-o" />}
              isLink
              onClick={() => navigate('/shop')}
            />
            <Cell
              title="兑换记录"
              label="查看历史兑换记录和订单状态"
              icon={<Icon name="orders-o" />}
              isLink
              onClick={() => navigate('/exchange-record')}
            />
          </Cell.Group>
        </div>

        {/* 使用说明 */}
        <div className="card">
          <div className="card-header">使用说明</div>
          <div className="card-body">
            <div style={{ lineHeight: '1.6', color: '#646566' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>1. 积分获取：</strong>参与直播互动、完成观看任务等方式获得积分
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>2. 积分兑换：</strong>在积分商城选择商品，使用积分进行兑换
              </p>
              <p style={{ margin: '0 0 0 0' }}>
                <strong>3. 注意事项：</strong>部分积分有有效期限制，请及时使用
              </p>
            </div>
          </div>
        </div>

        {/* 热门商品预览 */}
        <div className="card">
          <div className="card-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>热门商品</span>
            <span
              style={{
                fontSize: '15px',
                color: '#007AFF',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/shop')}
            >
              查看更多 →
            </span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <Grid columnNum={2} gutter={12}>
              <Grid.Item>
                <div style={{
                  background: '#f7f8fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: '#F2F2F7',
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    <GiftIcon />
                  </div>
                  <div style={{ fontSize: '15px', marginBottom: '4px', fontWeight: '500' }}>
                    精美礼品
                  </div>
                  <div style={{ fontSize: '13px', color: '#007AFF' }}>
                    200积分起
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{
                  background: '#f7f8fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: '#F2F2F7',
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    <TicketIcon />
                  </div>
                  <div style={{ fontSize: '15px', marginBottom: '4px', fontWeight: '500' }}>
                    优惠券
                  </div>
                  <div style={{ fontSize: '13px', color: '#007AFF' }}>
                    50积分起
                  </div>
                </div>
              </Grid.Item>
            </Grid>
          </div>
        </div>

        {/* 底部安全区域 */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};

const GiftIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.5C9.25 2.5 7.5 4.75 7.5 7.5C7.5 9.25 8.5 10.75 10 11.5V12.5H5V17.5H19V12.5H14V11.5C15.5 10.75 16.5 9.25 16.5 7.5C16.5 4.75 14.75 2.5 12 2.5Z" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12.5H19" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 21.5V12.5" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TicketIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.25 12C21.25 11.19 20.81 10.5 20 10.5H4C3.19 10.5 2.75 11.19 2.75 12C2.75 12.81 3.19 13.5 4 13.5H20C20.81 13.5 21.25 12.81 21.25 12Z" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 5.5H20C20.81 5.5 21.25 6.19 21.25 7V8.5H2.75V7C2.75 6.19 3.19 5.5 4 5.5Z" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 18.5H20C20.81 18.5 21.25 17.81 21.25 17V15.5H2.75V17C2.75 17.81 3.19 18.5 4 18.5Z" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


export default Home;
