import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  NavBar,
  Image,
  Button,
  Tag,
  Cell,
  Dialog,
  Field,
  Toast,
  ActionSheet,
  Skeleton
} from 'react-vant';
import { useNavigate, useParams } from 'react-router-dom';
import { productAPI, exchangeAPI, utils } from '../services/api';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

// 表单验证规则
const VALIDATION_RULES = {
  contactName: {
    required: true,
    minLength: 2,
    maxLength: 20,
    pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
    messages: {
      required: '请输入收货人姓名',
      minLength: '姓名至少2个字符',
      maxLength: '姓名不能超过20个字符',
      pattern: '姓名只能包含中文、英文和空格'
    }
  },
  contactPhone: {
    required: true,
    pattern: /^1[3-9]\d{9}$/,
    messages: {
      required: '请输入联系电话',
      pattern: '请输入正确的11位手机号码'
    }
  },
  shippingAddress: {
    required: true,
    minLength: 10,
    maxLength: 200,
    messages: {
      required: '请输入收货地址',
      minLength: '地址至少10个字符',
      maxLength: '地址不能超过200个字符'
    }
  }
};

// 验证单个字段
const validateField = (fieldName, value) => {
  const rules = VALIDATION_RULES[fieldName];
  if (!rules) return null;

  const trimmedValue = value?.trim() || '';

  if (rules.required && !trimmedValue) {
    return rules.messages.required;
  }

  if (rules.minLength && trimmedValue.length < rules.minLength) {
    return rules.messages.minLength;
  }

  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    return rules.messages.maxLength;
  }

  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    return rules.messages.pattern;
  }

  return null;
};

// 验证所有字段
const validateForm = (form) => {
  const errors = {};
  let firstError = null;

  Object.keys(VALIDATION_RULES).forEach(fieldName => {
    const error = validateField(fieldName, form[fieldName]);
    if (error) {
      errors[fieldName] = error;
      if (!firstError) firstError = error;
    }
  });

  return { errors, firstError, isValid: !firstError };
};

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exchangeVisible, setExchangeVisible] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    quantity: 1,
    contactName: '',
    contactPhone: '',
    shippingAddress: ''
  });
  const [formErrors, setFormErrors] = useState({});

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

  // 实时验证字段
  const handleFieldChange = useCallback((fieldName, value) => {
    setExchangeForm(prev => ({ ...prev, [fieldName]: value }));
    
    // 清除该字段的错误
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [formErrors]);

  // 字段失焦时验证
  const handleFieldBlur = useCallback((fieldName) => {
    const error = validateField(fieldName, exchangeForm[fieldName]);
    if (error) {
      setFormErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [exchangeForm]);

  // 计算表单是否可提交
  const canSubmit = useMemo(() => {
    const { isValid } = validateForm(exchangeForm);
    return isValid && !submitting;
  }, [exchangeForm, submitting]);

  const handleConfirmExchange = async () => {
    if (!user?.user_id) {
      Toast.fail('请先登录');
      setExchangeVisible(false);
      navigate('/login');
      return;
    }

    // 验证表单
    const { errors, firstError, isValid } = validateForm(exchangeForm);
    setFormErrors(errors);

    if (!isValid) {
      Toast.fail(firstError);
      return;
    }

    try {
      setSubmitting(true);
      await exchangeAPI.create({
        product_id: product.id,
        quantity: exchangeForm.quantity,
        contact_name: exchangeForm.contactName.trim(),
        contact_phone: exchangeForm.contactPhone.trim(),
        shipping_address: exchangeForm.shippingAddress.trim(),
      });

      Toast.success('兑换申请已提交');
      setExchangeVisible(false);
      
      // 重置表单
      setExchangeForm({
        quantity: 1,
        contactName: '',
        contactPhone: '',
        shippingAddress: ''
      });
      setFormErrors({});

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
    } finally {
      setSubmitting(false);
    }
  };

  // 关闭弹窗时重置表单错误
  const handleCloseExchange = useCallback(() => {
    setExchangeVisible(false);
    setFormErrors({});
  }, []);

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
        <div className="page-content">
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <Skeleton style={{ height: '220px', width: '100%' }} />
            <div style={{ padding: '16px' }}>
              <Skeleton title row={3} />
            </div>
          </div>
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
        onClose={handleCloseExchange}
        onCancel={handleCloseExchange}
        title="填写兑换信息"
        closeable
      >
        <div style={{ padding: 16 }}>
          <Field
            value={exchangeForm.contactName}
            onChange={(value) => handleFieldChange('contactName', value)}
            onBlur={() => handleFieldBlur('contactName')}
            label="收货人"
            placeholder="请输入收货人姓名（2-20字符）"
            required
            clearable
            maxLength={20}
            error={!!formErrors.contactName}
            errorMessage={formErrors.contactName}
          />
          <Field
            value={exchangeForm.contactPhone}
            onChange={(value) => handleFieldChange('contactPhone', value)}
            onBlur={() => handleFieldBlur('contactPhone')}
            label="联系电话"
            placeholder="请输入11位手机号码"
            type="tel"
            required
            clearable
            maxLength={11}
            error={!!formErrors.contactPhone}
            errorMessage={formErrors.contactPhone}
          />
          <Field
            value={exchangeForm.shippingAddress}
            onChange={(value) => handleFieldChange('shippingAddress', value)}
            onBlur={() => handleFieldBlur('shippingAddress')}
            label="收货地址"
            placeholder="请输入详细收货地址（10-200字符）"
            type="textarea"
            rows={3}
            required
            clearable
            maxLength={200}
            showWordLimit
            error={!!formErrors.shippingAddress}
            errorMessage={formErrors.shippingAddress}
          />
          
          {/* 兑换信息提示 */}
          <div style={{
            marginTop: 16,
            padding: '12px',
            background: '#FFF7E6',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#FA8C16'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>温馨提示：</div>
            <div>• 请确保收货信息准确无误</div>
            <div>• 兑换成功后将扣除 {product ? utils.formatNumber(product.points_required) : 0} 积分</div>
            <div>• 兑换后不支持退换，请谨慎操作</div>
          </div>
          
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <Button
              block
              onClick={handleCloseExchange}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="primary"
              block
              onClick={handleConfirmExchange}
              loading={submitting}
              disabled={!canSubmit}
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
