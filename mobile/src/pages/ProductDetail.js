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
import { useAuth } from '../context/AuthContext';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exchangeVisible, setExchangeVisible] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
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
      console.error('获取商品详情失败:', error);
      Toast.fail('商品不存在或已下架');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleExchange = () => {
    if (!user?.user_id) {
      Toast.fail('请先登录');
      navigate('/login');
      return;
    }
    if (!product || product.stock === 0) {
      Toast.fail('商品暂时缺货');
      return;
    }
    setExchangeVisible(true);
  };

  const handleConfirmExchange = async () => {
    if (!user?.user_id) {
      Toast.fail('请先登录');
      setExchangeVisible(false);
      navigate('/login');
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
        product_id: product.id,
        quantity: exchangeForm.quantity,
        contact_name: exchangeForm.contactName.trim(),
        contact_phone: exchangeForm.contactPhone.trim(),
        shipping_address: exchangeForm.shippingAddress.trim(),
      });

      Toast.success('兑换申请已提交');
      setExchangeVisible(false);

      Dialog.confirm({
        title: '兑换成功',
        message: '是否前往查看兑换记录？',
      }).then(() => {
        navigate('/exchange-record');
      }).catch(() => {
        navigate(-1);
      });
    } catch (error) {
      console.error('兑换失败:', error);
      Toast.fail(error?.response?.data?.message || '兑换失败，请稍后重试');
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
        <div className="page-content">
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#969799' }}>
            商品不存在或已下架
          </div>
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
      
      <div className="page-content">
        {/* 商品主信息 */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
          <Image
            src={utils.buildImageUrl(product.image_url)}
            alt={product.name}
            width="100%"
            height="220px"
            fit="cover"
          />

          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {product.name}
            </div>

            <div style={{ marginBottom: 8 }}>
              {product.is_hot && (
                <Tag color="#FF3B30" style={{ marginRight: 8 }}>热门</Tag>
              )}
              {product.is_new && (
                <Tag color="#FF9500">新品</Tag>
              )}
            </div>

            <div style={{ marginBottom: 8 }}>
              <span style={{ 
                fontSize: 20, 
                fontWeight: 600, 
                color: '#FF3B30'
              }}>
                {utils.formatNumber(product.points_required)} 积分
              </span>
              {product.original_price && (
                <span style={{ 
                  fontSize: 14, 
                  color: '#969799',
                  textDecoration: 'line-through',
                  marginLeft: 8
                }}>
                  ¥{product.original_price}
                </span>
              )}
            </div>
            
            <div style={{ fontSize: 14, color: '#969799' }}>
              {product.stock === -1 ? '库存充足' : `库存 ${product.stock}`}
            </div>
          </div>

          {product.description && (
            <div style={{ 
              fontSize: 14, 
              color: '#646566', 
              lineHeight: '1.6',
              padding: '0 16px 16px'
            }}>
              {product.description}
            </div>
          )}
        </div>

        {/* 商品信息 */}
        <div style={{ marginTop: 12, background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
          <Cell.Group>
            <Cell title="商品分类" value={product.category} />
            <Cell title="已兑数量" value={`${product.sold_count} 件`} />
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

      {/* 底部兑换按钮 */}
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

      {/* 兑换信息填写 */}
      <ActionSheet
        visible={exchangeVisible}
        onClose={() => setExchangeVisible(false)}
        onCancel={() => setExchangeVisible(false)}
        title="填写兑换信息"
        closeable
      >
        <div style={{ padding: 16 }}>
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
          
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
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
