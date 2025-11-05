import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Switch, 
  Upload, 
  Space, 
  Typography, 
  Tag, 
  Popconfirm,
  message,
  Image,
  DatePicker,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UploadOutlined,
  ShopOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { productsAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ProductManagement = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const previewObjectUrlRef = useRef(null);

  const clearPreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  const buildPreviewUrl = useCallback((url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    if (process.env.REACT_APP_FILE_BASE_URL) {
      return `${process.env.REACT_APP_FILE_BASE_URL.replace(/\/$/, '')}${url}`;
    }
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    return url;
  }, []);

  // Fixed: Wrap fetchProducts in useCallback
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setProducts(response.data.list);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
      }));
    } catch (error) {
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return () => {
      clearPreviewObjectUrl();
    };
  }, [clearPreviewObjectUrl]);

  const handleAdd = () => {
    setEditingProduct(null);
    setImageUrl('');
    setPreviewUrl('');
    clearPreviewObjectUrl();
    form.resetFields();
    form.setFieldsValue({
      image_url: '',
      stock: 0,
      sort_order: 0,
      is_active: true,
      is_hot: false,
      is_new: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    setImageUrl(record.image_url || '');
    clearPreviewObjectUrl();
    setPreviewUrl(buildPreviewUrl(record.image_url || ''));
    form.setFieldsValue({
      ...record,
      time_range: record.start_time && record.end_time ? [
        dayjs(record.start_time),
        dayjs(record.end_time)
      ] : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await productsAPI.delete(id);
      message.success('删除成功');
      fetchProducts();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await productsAPI.toggle(id, isActive);
      message.success(isActive ? '上架成功' : '下架成功');
      fetchProducts();
    } catch (error) {
      console.error('状态切换失败:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        ...values,
        image_url: imageUrl,
        start_time: values.time_range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.time_range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };
      delete submitData.time_range;

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, submitData);
        message.success('更新成功');
      } else {
        await productsAPI.create(submitData);
        message.success('创建成功');
      }
      setModalVisible(false);
      clearPreviewObjectUrl();
      setImageUrl('');
      setPreviewUrl('');
      form.resetFields();
      fetchProducts();
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleImageUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('仅支持上传图片文件');
      return Upload.LIST_IGNORE;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB');
      return Upload.LIST_IGNORE;
    }

    const formData = new FormData();
    formData.append('file', file);

    clearPreviewObjectUrl();
    const localPreview = URL.createObjectURL(file);
    previewObjectUrlRef.current = localPreview;
    setPreviewUrl(localPreview);

    try {
      setUploading(true);
      const response = await productsAPI.upload(formData);
      const uploadData = response?.data || {};
      const storedUrl = uploadData.path || uploadData.url || '';
      const previewSource = uploadData.url || uploadData.path || storedUrl;

      if (storedUrl || previewSource) {
        if (storedUrl) {
          setImageUrl(storedUrl);
          form.setFieldsValue({ image_url: storedUrl });
        } else {
          setImageUrl(previewSource);
          form.setFieldsValue({ image_url: previewSource });
        }

        clearPreviewObjectUrl();
        setPreviewUrl(buildPreviewUrl(previewSource));
      }

      message.success('图片上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      clearPreviewObjectUrl();
      setPreviewUrl(buildPreviewUrl(imageUrl));
    } finally {
      setUploading(false);
    }

    return Upload.LIST_IGNORE;
  };

  const categories = [
    '生活用品',
    '数码产品',
    '服饰',
    '娱乐',
    '优惠券',
    '其他'
  ];

  const columns = [
    {
      title: '商品图片',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 80,
      render: (url) => (
        url ? (
          <Image
            src={url}
            alt="商品图片"
            width={50}
            height={50}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        ) : (
          <div style={{ 
            width: 50, 
            height: 50, 
            background: '#f5f5f5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 4
          }}>
            <EyeOutlined style={{ color: '#ccc' }} />
          </div>
        )
      ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '所需积分',
      dataIndex: 'points_required',
      key: 'points_required',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '原价',
      dataIndex: 'original_price',
      key: 'original_price',
      width: 100,
      align: 'right',
      render: (value) => (
        value ? `¥${value}` : '-'
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      align: 'right',
      render: (value) => (
        value === -1 ? (
          <Tag color="green">无限</Tag>
        ) : (
          <Text style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
            {value}
          </Text>
        )
      ),
    },
    {
      title: '已售',
      dataIndex: 'sold_count',
      key: 'sold_count',
      width: 80,
      align: 'right',
      render: (value) => (
        <Text>{value?.toLocaleString()}</Text>
      ),
    },
    {
      title: '标签',
      key: 'tags',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.is_hot && <Tag color="red">热门</Tag>}
          {record.is_new && <Tag color="orange">新品</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (value, record) => (
        <Switch
          checked={value}
          onChange={(checked) => handleToggle(record.id, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      align: 'center',
      render: (value) => <Tag color="purple">{value}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个商品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">商品管理</Title>
        <p className="page-description">
          管理积分商城中的商品信息
        </p>
      </div>

      <Card 
        title={
          <Space>
            <ShopOutlined />
            商品列表
          </Space>
        }
        className="content-card"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchProducts}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增商品
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个商品`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
              }));
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingProduct ? '编辑商品' : '新增商品'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          clearPreviewObjectUrl();
          setImageUrl('');
          setPreviewUrl('');
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="商品名称"
                rules={[
                  { required: true, message: '请输入商品名称' },
                  { max: 200, message: '商品名称不能超过200个字符' }
                ]}
              >
                <Input placeholder="请输入商品名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="商品分类"
                rules={[{ required: true, message: '请选择商品分类' }]}
              >
                <Select placeholder="选择商品分类">
                  {categories.map(category => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="商品描述"
          >
            <TextArea 
              rows={3}
              placeholder="请输入商品描述"
              maxLength={1000}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="points_required"
                label="所需积分"
                rules={[
                  { required: true, message: '请输入所需积分' },
                  { type: 'number', min: 1, message: '积分必须大于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入所需积分"
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="original_price"
                label="原价（元）"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="商品原价"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="库存"
                rules={[{ required: true, message: '请输入库存数量' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="库存数量，-1表示无限"
                  min={-1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="商品图片">
            <Upload
              name="file"
              listType="picture-card"
              className="avatar-uploader"
              accept="image/*"
              maxCount={1}
              disabled={uploading}
              showUploadList={false}
              beforeUpload={handleImageUpload}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="商品图片" style={{ width: '100%' }} />
              ) : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sort_order"
                label="排序"
                rules={[{ required: true, message: '请输入排序值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="数字越大排序越靠前"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="time_range"
                label="上架时间"
              >
                <RangePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="is_active"
                label="上架状态"
                valuePropName="checked"
              >
                <Switch checkedChildren="上架" unCheckedChildren="下架" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="is_hot"
                label="热门商品"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="is_new"
                label="新品标识"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                {editingProduct ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductManagement;







