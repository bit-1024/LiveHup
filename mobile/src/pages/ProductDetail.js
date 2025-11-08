import React, { useState, useEffect, useCallback } from 'react';
import {
  NavBar,
  Image,
  Button,
  Tag,
  Cell,
  Dialog,
  Field,
  Toast,
  ActionSheet
} from 'react-vant';
import { useNavigate, useParams } from 'react-router-dom';
import { productAPI, exchangeAPI, utils } from '../services/api';
import Icon from '../components/Icon';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exchangeVisible, setExchangeVisible] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    userId: '',
    quantity: 1,
    contactName: '',
    contactPhone: '',
    shippingAddress: ''
  });

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getDetail(id);
      setProduct(response.data);
    } catch (error) {
      console.error('加载商品详情失败:', error);
      Toast.fail('商品不存在');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleExchange = () => {
    if (!product || product.stock === 0) {
      Toast.fail('商品暂时缺货');
      return;
    }
    setExchangeVisible(true);
  };

  const handleConfirmExchange = async () => {
    if (!exchangeForm.userId.trim()) {
      Toast.fail('请输入用户ID');
      return;
    }
    if (!exchangeForm.contactName.trim()) {
      Toast.fail('请输入收货人姓名');
      return;
    }
    if (!exchangeForm.contactPhone.trim()) {
      Toast.fail('请输入联系电话');
      return;
    }
    if (!exchangeForm.shippingAddress.trim()) {
      Toast.fail('请输入收货地址');
      return;
    }

    try {
      await exchangeAPI.create({
        user_id: exchangeForm.userId.trim(),
        product_id: product.id,
        quantity: exchangeForm.quantity,
        contact_name: exchangeForm.contactName.trim(),
        contact_phone: exchangeForm.contactPhone.trim(),
        shipping_address: exchangeForm.shippingAddress.trim()
      });

      Toast.success('兑换申请提交成功');
      setExchangeVisible(false);
      
      // 询问是否查看兑换记录
      Dialog.confirm({
        title: '兑换成功',
        message: '是否查看兑换记录？',
      }).then(() => {
        navigate('/exchange-record');
      }).catch(() => {
        navigate(-1);
      });
    } catch (error) {
      console.error('兑换失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <NavBar 
          title="商品详情" 
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

  if (!product) {
    return (
      <div className="page-container">
        <NavBar 
          title="商品详情" 
          leftArrow={<Icon name="arrow-left" />}
          onClickLeft={() => navigate(-1)}
          fixed 
          placeholder
        />
        <div className="empty-state">
          <div className="empty-text">商品不存在</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <NavBar 
        title="商品详情" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div style={{ paddingBottom: '80px' }}>
        {/* 商品图片 */}
        <div style={{ position: 'relative' }}>
          <Image
            src={utils.buildImageUrl(product.image_url)}
            alt={product.name}
            width="100%"
            height="300px"
            fit="cover"
            errorIcon="shop-o"
          />
          
          {/* 商品标签 */}
          <div style={{ 
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            gap: '6px'
          }}>
            {product.is_hot && (
              <Tag color="#FF3B30">
                <Icon name="fire-o" style={{ marginRight: '4px' }} />
                热门
              </Tag>
            )}
            {product.is_new && (
              <Tag color="#FF9500">
                <Icon name="new-o" style={{ marginRight: '4px' }} />
                新品
              </Tag>
            )}
          </div>

          {/* 库存状态 */}
          {product.stock === 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              暂时缺货
            </div>
          )}
        </div>

        {/* 商品信息 */}
        <div style={{ background: '#fff', padding: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            {product.name}
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <div>
              <span style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#FF3B30'
              }}>
                {utils.formatNumber(product.points_required)}积分
              </span>
              {product.original_price && (
                <span style={{ 
                  fontSize: '14px', 
                  color: '#969799',
                  textDecoration: 'line-through',
                  marginLeft: '8px'
                }}>
                  ¥{product.original_price}
                </span>
              )}
            </div>
            
            <div style={{ fontSize: '14px', color: '#969799' }}>
              {product.stock === -1 ? '库存充足' : `库存${product.stock}`}
            </div>
          </div>

          {product.description && (
            <div style={{ 
              fontSize: '14px', 
              color: '#646566', 
              lineHeight: '1.6' 
            }}>
              {product.description}
            </div>
          )}
        </div>

        {/* 商品详情 */}
        <div style={{ marginTop: '12px', background: '#fff' }}>
          <Cell.Group>
            <Cell title="商品分类" value={product.category} />
            <Cell title="已售数量" value={`${product.sold_count}件`} />
            {product.start_time && product.end_time && (
              <Cell 
                title="活动时间" 
                value={`${utils.formatDate(product.start_time)} - ${utils.formatDate(product.end_time)}`}
                label="限时兑换"
              />
            )}
          </Cell.Group>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed-bottom-button safe-area">
        <Button 
          type="primary" 
          size="large" 
          block
          disabled={product.stock === 0}
          onClick={handleExchange}
        >
          {product.stock === 0 ? '暂时缺货' : '立即兑换'}
        </Button>
      </div>

      {/* 兑换弹窗 */}
      <ActionSheet
        visible={exchangeVisible}
        onClose={() => setExchangeVisible(false)}
        onCancel={() => setExchangeVisible(false)}
        title="填写兑换信息"
        closeable
      >
        <div style={{ padding: '16px' }}>
          <Field
            value={exchangeForm.userId}
            onChange={(value) => setExchangeForm(prev => ({ ...prev, userId: value }))}
            label="用户ID"
            placeholder="请输入您的用户ID"
            required
            clearable
          />
          <Field
            value={exchangeForm.contactName}
            onChange={(value) => setExchangeForm(prev => ({ ...prev, contactName: value }))}
            label="收货人"
            placeholder="请输入收货人姓名"
            required
            clearable
          />
          <Field
            value={exchangeForm.contactPhone}
            onChange={(value) => setExchangeForm(prev => ({ ...prev, contactPhone: value }))}
            label="联系电话"
            placeholder="请输入联系电话"
            required
            clearable
          />
          <Field
            value={exchangeForm.shippingAddress}
            onChange={(value) => setExchangeForm(prev => ({ ...prev, shippingAddress: value }))}
            label="收货地址"
            placeholder="请输入详细收货地址"
            type="textarea"
            rows={3}
            required
            clearable
          />
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <Button 
              block 
              onClick={() => setExchangeVisible(false)}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              block
              onClick={handleConfirmExchange}
            >
              确认兑换
            </Button>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
};

export default ProductDetail;



