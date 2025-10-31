import React, { useState } from 'react';
import { 
  NavBar, 
  Field, 
  Button, 
  Card, 
  List, 
  Cell,
  Tag,
  Empty,
  Image,
  PullRefresh
} from 'vant';
import { ArrowLeft, Search, OrdersO } from '@vant/icons';
import { useNavigate } from 'react-router-dom';
import { exchangeAPI, utils } from '../services/api';

const ExchangeRecord = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);

  const handleQuery = async (reset = false) => {
    if (!userId.trim()) {
      Toast.fail('请输入用户ID');
      return;
    }

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await exchangeAPI.getMyExchanges(userId.trim(), {
        page: currentPage,
        pageSize: 10
      });
      
      const newExchanges = response.data.list || [];
      
      if (reset) {
        setExchanges(newExchanges);
        setPage(2);
      } else {
        setExchanges(prev => [...prev, ...newExchanges]);
        setPage(prev => prev + 1);
      }
      
      setFinished(newExchanges.length < 10);
      setHasQueried(true);
    } catch (error) {
      console.error('查询失败:', error);
      if (reset) {
        setExchanges([]);
        setHasQueried(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    handleQuery(true);
  };

  const handleLoadMore = () => {
    if (!finished && !loading) {
      handleQuery(false);
    }
  };

  const handleReset = () => {
    setUserId('');
    setExchanges([]);
    setHasQueried(false);
    setPage(1);
    setFinished(false);
  };

  const handleExchangeClick = (exchange) => {
    navigate(`/exchange/${exchange.id}`);
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: '#ff976a', text: '待处理' },
      confirmed: { color: '#1989fa', text: '已确认' },
      shipped: { color: '#ff976a', text: '已发货' },
      completed: { color: '#07c160', text: '已完成' },
      cancelled: { color: '#ee0a24', text: '已取消' },
    };
    const config = statusMap[status] || { color: '#969799', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const ExchangeItem = ({ exchange }) => (
    <Card 
      style={{ marginBottom: '12px', cursor: 'pointer' }}
      onClick={() => handleExchangeClick(exchange)}
    >
      <div style={{ padding: '12px 0' }}>
        {/* 订单头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#969799' }}>
            订单号: {exchange.exchange_no}
          </div>
          {getStatusTag(exchange.status)}
        </div>

        {/* 商品信息 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <Image
            src={exchange.product_image}
            alt={exchange.product_name}
            width="60px"
            height="60px"
            fit="cover"
            round
            errorIcon={<OrdersO />}
          />
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '4px',
              lineHeight: '1.4'
            }}>
              {exchange.product_name}
            </div>
            <div style={{ fontSize: '12px', color: '#969799' }}>
              数量: {exchange.quantity}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#ee0a24',
              fontWeight: '600',
              marginTop: '4px'
            }}>
              {utils.formatNumber(exchange.points_used)}积分
            </div>
          </div>
        </div>

        {/* 订单信息 */}
        <div style={{ 
          fontSize: '12px', 
          color: '#969799',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>兑换时间: {utils.formatDate(exchange.exchange_date, 'MM-DD HH:mm')}</span>
          <span>点击查看详情 →</span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="page-container">
      <NavBar 
        title="兑换记录" 
        leftArrow
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 查询表单 */}
        <Card>
          <div style={{ padding: '16px 0' }}>
            <Field
              value={userId}
              onChange={setUserId}
              label="用户ID"
              placeholder="请输入您的用户ID"
              clearable
              maxlength={50}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <Button 
                type="primary" 
                block 
                loading={loading}
                onClick={() => handleQuery(true)}
                icon={<Search />}
              >
                查询记录
              </Button>
              {hasQueried && (
                <Button 
                  block 
                  onClick={handleReset}
                  style={{ flex: '0 0 80px' }}
                >
                  重置
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 查询结果 */}
        {hasQueried && (
          <div style={{ marginTop: '12px' }}>
            {exchanges.length > 0 ? (
              <PullRefresh
                value={refreshing}
                onRefresh={handleRefresh}
              >
                <List
                  value={loading}
                  finished={finished}
                  onLoad={handleLoadMore}
                  finishedText="没有更多记录了"
                  loadingText="加载中..."
                >
                  {exchanges.map(exchange => (
                    <ExchangeItem key={exchange.id} exchange={exchange} />
                  ))}
                </List>
              </PullRefresh>
            ) : (
              <Card>
                <Empty 
                  description="暂无兑换记录" 
                  imageSize={80}
                >
                  <div style={{ marginTop: '16px', color: '#969799', fontSize: '14px' }}>
                    请检查用户ID是否正确
                  </div>
                </Empty>
              </Card>
            )}
          </div>
        )}

        {/* 使用提示 */}
        {!hasQueried && (
          <Card style={{ marginTop: '12px' }}>
            <div style={{ padding: '16px 0' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px',
                color: '#323233'
              }}>
                使用说明
              </div>
              <div style={{ lineHeight: '1.6', color: '#646566', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 请输入您的用户ID查询兑换记录
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 可查看所有历史兑换订单状态
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 点击订单可查看详细信息
                </p>
                <p style={{ margin: '0' }}>
                  • 如有问题请联系客服处理
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 底部安全区域 */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default ExchangeRecord;