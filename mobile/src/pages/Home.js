import React from 'react';
import { NavBar, Cell, CellGroup, Grid, GridItem, Image, Divider } from 'vant';
import {
  Search,
  ShopO,
  PointGiftO,
  OrdersO,
  QuestionO,
  ServiceO,
  ScanO
} from '@vant/icons';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: <ScanO />,
      text: '扫码查询',
      color: '#1989fa',
      path: '/qr-scanner'
    },
    {
      icon: <Search />,
      text: '积分查询',
      color: '#07c160',
      path: '/points-query'
    },
    {
      icon: <ShopO />,
      text: '积分商城',
      color: '#ff976a',
      path: '/shop'
    },
    {
      icon: <OrdersO />,
      text: '兑换记录',
      color: '#ee0a24',
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
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      />
      
      <div className="page-content">
        {/* 欢迎横幅 */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '32px 16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            欢迎使用积分系统
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            查询积分、兑换商品、享受专属福利
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="card">
          <div className="card-header">快捷操作</div>
          <Grid columnNum={2} gutter={16} style={{ padding: '16px' }}>
            {quickActions.map((action, index) => (
              <GridItem 
                key={index}
                onClick={() => handleQuickAction(action.path)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ 
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  <div style={{ 
                    fontSize: '32px', 
                    color: action.color,
                    marginBottom: '8px'
                  }}>
                    {action.icon}
                  </div>
                  <div style={{ 
                    fontSize: '14px',
                    color: '#323233'
                  }}>
                    {action.text}
                  </div>
                </div>
              </GridItem>
            ))}
          </Grid>
        </div>

        {/* 功能介绍 */}
        <div className="card">
          <div className="card-header">功能介绍</div>
          <CellGroup inset={false}>
            <Cell
              title="扫码查询"
              label="扫描管理员分享的二维码快速查询积分"
              icon={<ScanO style={{ color: '#1989fa' }} />}
              isLink
              onClick={() => navigate('/qr-scanner')}
            />
            <Cell
              title="积分查询"
              label="输入用户ID即可查询个人积分余额和明细"
              icon={<Search style={{ color: '#07c160' }} />}
              isLink
              onClick={() => navigate('/points-query')}
            />
            <Cell
              title="积分商城"
              label="使用积分兑换心仪商品，享受专属优惠"
              icon={<ShopO style={{ color: '#ff976a' }} />}
              isLink
              onClick={() => navigate('/shop')}
            />
            <Cell
              title="兑换记录"
              label="查看历史兑换记录和订单状态"
              icon={<OrdersO style={{ color: '#ee0a24' }} />}
              isLink
              onClick={() => navigate('/exchange-record')}
            />
          </CellGroup>
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
                fontSize: '14px', 
                color: '#1989fa',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/shop')}
            >
              查看更多 →
            </span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <Grid columnNum={2} gutter={12}>
              <GridItem>
                <div style={{ 
                  background: '#f7f8fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    width: '60px',
                    height: '60px',
                    background: '#1989fa',
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px'
                  }}>
                    🎁
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                    精美礼品
                  </div>
                  <div style={{ fontSize: '12px', color: '#1989fa' }}>
                    200积分起
                  </div>
                </div>
              </GridItem>
              <GridItem>
                <div style={{ 
                  background: '#f7f8fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    width: '60px',
                    height: '60px',
                    background: '#07c160',
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px'
                  }}>
                    🎫
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                    优惠券
                  </div>
                  <div style={{ fontSize: '12px', color: '#07c160' }}>
                    50积分起
                  </div>
                </div>
              </GridItem>
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