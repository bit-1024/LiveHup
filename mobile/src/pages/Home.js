import React from 'react';
import { NavBar, Cell, Grid } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

const Home = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: 'scan',
      text: '扫码查询',
      color: '#007AFF',
      path: '/qr-scanner'
    },
    {
      icon: 'search',
      text: '积分查询',
      color: '#007AFF',
      path: '/points-query'
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
        {/* 欢迎横幅 */}
        <div className="card" style={{
          background: '#007AFF',
          color: 'white',
          textAlign: 'center',
          padding: '32px 16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
            欢迎使用积分系统
          </div>
          <div style={{ fontSize: '15px', opacity: 0.9 }}>
            查询积分、兑换商品、享受专属福利
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="card">
          <div className="card-header">快捷操作</div>
          <Grid columnNum={2} gutter={16} style={{ padding: '16px' }}>
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
              title="扫码查询"
              label="扫描管理员分享的二维码快速查询积分"
              icon={<Icon name="scan" />}
              isLink
              onClick={() => navigate('/qr-scanner')}
            />
            <Cell
              title="积分查询"
              label="输入用户ID即可查询个人积分余额和明细"
              icon={<Icon name="search" />}
              isLink
              onClick={() => navigate('/points-query')}
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
                <strong>2. 积分查询：</strong>扫描二维码或输入用户ID即可查询积分余额
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>3. 积分兑换：</strong>在积分商城选择商品，使用积分进行兑换
              </p>
              <p style={{ margin: '0 0 0 0' }}>
                <strong>4. 注意事项：</strong>部分积分有有效期限制，请及时使用
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
                    🎁
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
                    🎫
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

export default Home;
