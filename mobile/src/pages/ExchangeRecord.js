import React, { useState } from 'react';
import { NavBar, Field, Button, Card, List, Tag, Empty, Image, PullRefresh, Toast } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { exchangeAPI, utils } from '../services/api';
import Icon from '../components/Icon';

const PAGE_SIZE = 10;

const statusMeta = {
  pending: { color: '#ff976a', text: '待处理' },
  confirmed: { color: '#1989fa', text: '已确认' },
  shipped: { color: '#ff976a', text: '已发货' },
  completed: { color: '#07c160', text: '已完成' },
  cancelled: { color: '#ee0a24', text: '已取消' },
};

const ExchangeRecord = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);

  const fetchRecords = async (reset = false) => {
    const trimmedId = userId.trim();
    if (!trimmedId) {
      Toast.fail('请输入用户ID');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const response = await exchangeAPI.getMyExchanges(trimmedId, {
        page: currentPage,
        pageSize: PAGE_SIZE
      });

      const list = response.data.list || [];

      if (reset) {
        setExchanges(list);
        setPage(2);
      } else {
        setExchanges(prev => [...prev, ...list]);
        setPage(prev => prev + 1);
      }

      setFinished(list.length < PAGE_SIZE);
      setHasQueried(true);
    } catch (error) {
      console.error('查询失败:', error);
      if (reset) {
        setExchanges([]);
      }
      setHasQueried(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setFinished(false);
    setPage(1);
    await fetchRecords(true);
  };

  const handleRefresh = async () => {
    setFinished(false);
    setPage(1);
    await fetchRecords(true);
  };

  const handleLoadMore = async () => {
    if (loading || finished) return;
    await fetchRecords(false);
  };

  const handleReset = () => {
    setUserId('');
    setExchanges([]);
    setHasQueried(false);
    setFinished(false);
    setPage(1);
  };

  const renderStatusTag = (status) => {
    const meta = statusMeta[status] || { color: '#969799', text: status };
    return <Tag color={meta.color}>{meta.text}</Tag>;
  };

  const handleExchangeClick = (exchange) => {
    navigate(`/exchange/${exchange.id}`);
  };

  return (
    <div className="page-container">
      <NavBar
        title="兑换记录"
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed
        placeholder
      />

      <div className="page-content">
        {/* 查询条件 */}
        <Card>
          <div style={{ padding: '16px 0' }}>
            <Field
              value={userId}
              onChange={setUserId}
              label="用户ID"
              placeholder="请输入用户ID"
              clearable
              maxlength={50}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <Button
                type="primary"
                block
                loading={loading}
                onClick={handleSubmit}
                icon={<Icon name="search" />}
              >
                查询记录
              </Button>
              {hasQueried && (
                <Button block onClick={handleReset} style={{ flex: '0 0 80px' }}>
                  清空
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 查询结果 */}
        {hasQueried && (
          <div style={{ marginTop: '12px' }}>
            {exchanges.length > 0 ? (
              <PullRefresh onRefresh={handleRefresh}>
                <List
                  loading={loading}
                  finished={finished}
                  onLoad={handleLoadMore}
                  finishedText="没有更多记录了"
                  loadingText="加载中..."
                >
                  {exchanges.map(exchange => (
                    <Card
                      key={exchange.id}
                      style={{ marginBottom: '12px', cursor: 'pointer' }}
                      onClick={() => handleExchangeClick(exchange)}
                    >
                      <div style={{ padding: '12px 0' }}>
                        {/* 头部信息 */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#969799' }}>
                            订单号: {exchange.exchange_no}
                          </div>
                          {renderStatusTag(exchange.status)}
                        </div>

                        {/* 商品信息 */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          <Image
                            src={exchange.product_image}
                            alt={exchange.product_name}
                            width="60px"
                            height="60px"
                            fit="cover"
                            lazyload
                            errorIcon={<Icon name="photo-fail" />}
                            style={{ borderRadius: '8px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                              {exchange.product_name}
                            </div>
                            <div style={{ fontSize: '14px', color: '#969799', marginBottom: '6px' }}>
                              数量: {exchange.quantity} | 积分消耗: {utils.formatNumber(exchange.points_used)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#969799' }}>
                              联系人: {exchange.contact_name || '-'} | 电话: {exchange.contact_phone || '-'}
                            </div>
                          </div>
                        </div>

                        {/* 底部信息 */}
                        <div style={{
                          fontSize: '12px',
                          color: '#969799',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>兑换时间: {utils.formatDate(exchange.exchange_date, 'MM-DD HH:mm')}</span>
                          <span>点击查看详情 &gt;</span>
                        </div>
                      </div>
                    </Card>
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
                    请确认用户ID是否正确
                  </div>
                </Empty>
              </Card>
            )}
          </div>
        )}

        {/* 使用说明 */}
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
                  • 输入用户ID查询兑换记录
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 可查看各笔兑换的状态和积分消耗
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 点击记录可进入详情页面
                </p>
                <p style={{ margin: 0 }}>
                  • 有疑问请联系运营人员
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 底部预留空间 */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default ExchangeRecord;
