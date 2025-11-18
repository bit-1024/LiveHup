import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, Card, List, Empty, PullRefresh, Tag, Toast } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { exchangeAPI, utils } from '../services/api';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const STATUS_META = {
  pending: { color: '#FF9500', text: '待处理' },
  confirmed: { color: '#007AFF', text: '已确认' },
  shipped: { color: '#FF9500', text: '已发货' },
  completed: { color: '#34C759', text: '已完成' },
  cancelled: { color: '#FF3B30', text: '已取消' },
};

const PAGE_SIZE = 10;

const ExchangeRecord = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);

  const fetchRecords = useCallback(async (reset = false) => {
    if (!user?.user_id) return;
    if (loading) return;
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const response = await exchangeAPI.getMyExchanges({
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
      const list = response?.data?.list || [];
      if (reset) {
        setRecords(list);
        setPage(2);
      } else {
        setRecords(prev => [...prev, ...list]);
        setPage(prev => prev + 1);
      }
      setFinished(list.length < PAGE_SIZE);
    } catch (error) {
      console.error('获取兑换记录失败:', error);
      Toast.fail(error?.response?.data?.message || '获取记录失败');
      if (reset) {
        setRecords([]);
      }
      setFinished(true);
    } finally {
      setLoading(false);
    }
  }, [page, user?.user_id, loading]);

  useEffect(() => {
    fetchRecords(true);
  }, [fetchRecords]);

  const handleRefresh = async () => {
    setFinished(false);
    setPage(1);
    await fetchRecords(true);
  };

  const renderStatus = (status) => {
    const meta = STATUS_META[status] || { color: '#969799', text: status };
    return <Tag color={meta.color}>{meta.text}</Tag>;
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
        {records.length > 0 ? (
          <PullRefresh onRefresh={handleRefresh}>
            <List
              loading={loading}
              finished={finished}
              onLoad={() => fetchRecords(false)}
              finishedText="没有更多记录了"
              loadingText="加载中..."
            >
              {records.map((exchange) => (
                <Card
                  key={exchange.id}
                  style={{ marginBottom: 12 }}
                  onClick={() => navigate(`/exchange/${exchange.id}`)}
                >
                  <div style={{ padding: '12px 0' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: 12, color: '#969799' }}>
                        订单号: {exchange.exchange_no}
                      </div>
                      {renderStatus(exchange.status)}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        background: '#f7f8fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        color: '#969799'
                      }}>
                        <Icon name="shop-o" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                          {exchange.product_name}
                        </div>
                        <div style={{ fontSize: 14, color: '#969799' }}>
                          数量: {exchange.quantity} | 消耗积分: {utils.formatNumber(exchange.points_used)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 12,
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
          <Card style={{ marginTop: 12 }}>
            <Empty
              description="暂无兑换记录"
              imageSize={80}
            >
              <div style={{ marginTop: 16, color: '#969799', fontSize: 14 }}>
                完成兑换后可以在这里查看记录
              </div>
            </Empty>
          </Card>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
};

export default ExchangeRecord;
