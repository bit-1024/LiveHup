import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, Card, Cell, Tag, Image, Steps, Empty, Button } from 'react-vant';
import { useNavigate, useParams } from 'react-router-dom';
import { exchangeAPI, utils } from '../services/api';
import Icon from '../components/Icon';

const ExchangeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadExchangeDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await exchangeAPI.getDetail(id);
      setExchange(response.data);
    } catch (error) {
      console.error('加载兑换详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: '#FF9500', text: '待处理' },
      confirmed: { color: '#007AFF', text: '已确认' },
      shipped: { color: '#FF9500', text: '已发货' },
      completed: { color: '#34C759', text: '已完成' },
      cancelled: { color: '#FF3B30', text: '已取消' },
    };
    const config = statusMap[status] || { color: '#8E8E93', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  useEffect(() => {
    loadExchangeDetail();
  }, [loadExchangeDetail]);

  const getStatusStep = (status) => {
    const statusSteps = {
      pending: 0,
      confirmed: 1,
      shipped: 2,
      completed: 3,
      cancelled: -1,
    };
    return statusSteps[status] || 0;
  };

  const copyOrderNo = () => {
    if (exchange?.exchange_no) {
      utils.copyToClipboard(exchange.exchange_no);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <NavBar 
          title="兑换详情" 
          leftArrow={<Icon name="arrow-left" />}
          onClickLeft={() => navigate(-1)}
          fixed 
          placeholder
        />
        <div className="loading-container">
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="page-container">
        <NavBar 
          title="兑换详情" 
          leftArrow={<Icon name="arrow-left" />}
          onClickLeft={() => navigate(-1)}
          fixed 
          placeholder
        />
        <div className="page-content">
          <Card>
            <Empty 
              description="兑换记录不存在" 
              imageSize={80}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <NavBar 
        title="兑换详情" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 订单状态 */}
        <Card style={{ borderRadius: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                订单状态
              </div>
              {getStatusTag(exchange.status)}
            </div>
            
            <Steps 
              active={getStatusStep(exchange.status)}
              direction="vertical"
              activeColor={exchange.status === 'cancelled' ? '#FF3B30' : '#007AFF'}
            >
              <Steps.Item>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>订单提交</div>
                <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                  {utils.formatDate(exchange.exchange_date, 'YYYY-MM-DD HH:mm')}
                </div>
              </Steps.Item>
              
              {exchange.confirmed_at && (
                <Steps.Item>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>订单确认</div>
                  <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                    {utils.formatDate(exchange.confirmed_at, 'YYYY-MM-DD HH:mm')}
                  </div>
                </Steps.Item>
              )}
              
              {exchange.shipped_at && (
                <Steps.Item>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>商品发货</div>
                  <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                    {utils.formatDate(exchange.shipped_at, 'YYYY-MM-DD HH:mm')}
                  </div>
                  {exchange.tracking_number && (
                    <div style={{ fontSize: '12px', color: '#007AFF', marginTop: '2px' }}>
                      物流单号: {exchange.tracking_number}
                    </div>
                  )}
                </Steps.Item>
              )}
              
              {exchange.completed_at && (
                <Steps.Item>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>兑换完成</div>
                  <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                    {utils.formatDate(exchange.completed_at, 'YYYY-MM-DD HH:mm')}
                  </div>
                </Steps.Item>
              )}
              
              {exchange.status === 'cancelled' && (
                <Steps.Item>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#FF3B30' }}>
                    订单取消
                  </div>
                  {exchange.cancelled_at && (
                    <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                      {utils.formatDate(exchange.cancelled_at, 'YYYY-MM-DD HH:mm')}
                    </div>
                  )}
                  {exchange.cancel_reason && (
                    <div style={{ fontSize: '12px', color: '#FF3B30', marginTop: '2px' }}>
                      取消原因: {exchange.cancel_reason}
                    </div>
                  )}
                </Steps.Item>
              )}
            </Steps>
          </div>
        </Card>

        {/* 商品信息 */}
        <Card style={{ marginTop: '12px', borderRadius: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600', 
              marginBottom: '16px'
            }}>
              商品信息
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <Image
                src={exchange.product_image}
                alt={exchange.product_name}
                width="80px"
                height="80px"
                fit="cover"
                round
                errorIcon={<Icon name="orders-o" />}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500',
                  marginBottom: '8px',
                  lineHeight: '1.4'
                }}>
                  {exchange.product_name}
                </div>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#969799' }}>
                    数量: {exchange.quantity}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    color: '#FF3B30',
                    fontWeight: '600'
                  }}>
                    {utils.formatNumber(exchange.points_used)}积分
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 订单信息 */}
        <Card style={{ marginTop: '12px', borderRadius: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600', 
              marginBottom: '16px'
            }}>
              订单信息
            </div>
            
            <Cell.Group inset={false}>
              <Cell 
                title="订单号" 
                value={exchange.exchange_no}
                isLink
                onClick={copyOrderNo}
                rightIcon={
                  <Button size="mini" type="primary" plain>
                    复制
                  </Button>
                }
              />
              <Cell title="用户ID" value={exchange.user_id} />
              <Cell title="兑换时间" value={utils.formatDate(exchange.exchange_date, 'YYYY-MM-DD HH:mm:ss')} />
            </Cell.Group>
          </div>
        </Card>

        {/* 收货信息 */}
        <Card style={{ marginTop: '12px', borderRadius: '12px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Icon name="location-o" color="#007AFF" />
              收货信息
            </div>
            
            <Cell.Group inset={false}>
              <Cell title="收货人" value={exchange.contact_name || '-'} />
              <Cell
                title="联系电话"
                value={exchange.contact_phone || '-'}
                rightIcon={exchange.contact_phone && <Icon name="phone-o" />}
                isLink={!!exchange.contact_phone}
                onClick={() => {
                  if (exchange.contact_phone) {
                    window.location.href = `tel:${exchange.contact_phone}`;
                  }
                }}
              />
              <Cell 
                title="收货地址" 
                value={exchange.shipping_address || '-'}
                label={exchange.shipping_address ? '点击复制地址' : undefined}
                isLink={!!exchange.shipping_address}
                onClick={() => {
                  if (exchange.shipping_address) {
                    utils.copyToClipboard(exchange.shipping_address);
                  }
                }}
              />
            </Cell.Group>
          </div>
        </Card>

        {/* 备注信息 */}
        {exchange.remark && (
          <Card style={{ marginTop: '12px', borderRadius: '12px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600', 
                marginBottom: '12px'
              }}>
                备注信息
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#646566',
                lineHeight: '1.6',
                background: '#f7f8fa',
                padding: '12px',
                borderRadius: '6px'
              }}>
                {exchange.remark}
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

export default ExchangeDetail;


