import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Tag, 
  Modal,
  Descriptions,
  Steps,
  Form,
  message,
  DatePicker,
  Row,
  Col,
  Statistic,
  Image
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  EditOutlined,
  DownloadOutlined,
  SwapOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { exchangesAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Step } = Steps;

const ExchangeManagement = () => {
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    dateRange: null,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [batchStatusModalVisible, setBatchStatusModalVisible] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [statusForm] = Form.useForm();
  const [batchStatusForm] = Form.useForm();
  const lastFilterParamsRef = useRef({});

  const buildFilterParams = useCallback(() => {
    const params = {};
    if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();
    if (filters.status) params.status = filters.status;
    if (filters.dateRange?.[0]) params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
    if (filters.dateRange?.[1]) params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
    return params;
  }, [filters]);

  const isZipBlob = async (blob) => {
    try {
      const buffer = await blob.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      return bytes[0] === 0x50 && bytes[1] === 0x4B;
    } catch (error) {
      console.warn('检测导出文件头失败:', error);
      return false;
    }
  };

  const isJsonResponseBlob = async (blob) => {
    if (!blob.type || !blob.type.includes('application/json')) {
      return false;
    }

    const looksLikeZip = await isZipBlob(blob);
    return !looksLikeZip;
  };

  // Fixed: Wrap fetchExchanges in useCallback
  const fetchExchanges = useCallback(async () => {
    try {
      setLoading(true);
      const filterParams = buildFilterParams();
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filterParams,
      };
      
      const response = await exchangesAPI.getList(params);
      setExchanges(response.data.list);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
      }));
      lastFilterParamsRef.current = filterParams;
    } catch (error) {
      console.error('获取兑换列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, buildFilterParams]);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  const showDetail = async (record) => {
    try {
      const response = await exchangesAPI.getDetail(record.id);
      setSelectedExchange(response.data);
      setDetailVisible(true);
    } catch (error) {
      console.error('获取兑换详情失败:', error);
    }
  };

  const showStatusModal = (record) => {
    setSelectedExchange(record);
    statusForm.setFieldsValue({
      status: record.status,
      tracking_number: record.tracking_number || '',
      remark: record.remark || '',
    });
    setStatusModalVisible(true);
  };

  const handleStatusUpdate = async (values) => {
    try {
      await exchangesAPI.updateStatus(selectedExchange.id, values.status, {
        tracking_number: values.tracking_number,
        remark: values.remark,
      });
      message.success('状态更新成功');
      setStatusModalVisible(false);
      fetchExchanges();
    } catch (error) {
      console.error('状态更新失败:', error);
    }
  };

  const handleBatchStatusUpdate = async (values) => {
    try {
      await exchangesAPI.batchUpdateStatus({
        ids: selectedRowKeys,
        ...values
      });
      message.success(`成功更新${selectedRowKeys.length}条记录`);
      setBatchStatusModalVisible(false);
      setSelectedRowKeys([]);
      fetchExchanges();
    } catch (error) {
      console.error('批量更新失败:', error);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchExchanges();
  };

  const handleReset = () => {
    setFilters({
      keyword: '',
      status: '',
      dateRange: null,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    lastFilterParamsRef.current = {};
  };

  const handleExport = async () => {
    try {
      const params = buildFilterParams();
      const blob = await exchangesAPI.export(params);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `兑换记录_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出错误:', error);
      message.error(error.message || '导出失败');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'processing', text: '待处理' },
      confirmed: { color: 'success', text: '已确认' },
      shipped: { color: 'warning', text: '已发货' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'error', text: '已取消' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

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

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: ['completed', 'cancelled'].includes(record.status),
    }),
  };

  const columns = [
    {
      title: '兑换单号',
      dataIndex: 'exchange_no',
      key: 'exchange_no',
      width: 180,
      render: (text) => (
        <Text code style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (text) => (
        <Text code style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '商品信息',
      key: 'product_info',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.product_image && (
            <Image
              src={record.product_image}
              alt="商品图片"
              width={40}
              height={40}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 500 }}>{record.product_name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              数量: {record.quantity}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '使用积分',
      dataIndex: 'points_used',
      key: 'points_used',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '联系信息',
      key: 'contact_info',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.contact_name || '-'}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.contact_phone || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '兑换时间',
      dataIndex: 'exchange_date',
      key: 'exchange_date',
      width: 160,
      render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          {record.status !== 'completed' && record.status !== 'cancelled' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => showStatusModal(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">兑换管理</Title>
        <p className="page-description">
          管理用户的积分兑换订单
        </p>
      </div>

      {/* 搜索筛选 */}
      <Card className="content-card" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="搜索兑换单号或用户ID"
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="订单状态"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="pending">待处理</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space wrap>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchExchanges}
              >
                刷新
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
              {selectedRowKeys.length > 0 && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setBatchStatusModalVisible(true)}
                >
                  批量处理({selectedRowKeys.length})
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 兑换列表 */}
      <Card 
        title={
          <Space>
            <SwapOutlined />
            兑换列表
          </Space>
        }
        className="content-card"
      >
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={exchanges}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条兑换记录`,
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

      {/* 详情弹窗 */}
      <Modal
        title="兑换详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedExchange && (
          <div>
            {/* 订单状态步骤 */}
            <Steps 
              current={getStatusStep(selectedExchange.status)}
              status={selectedExchange.status === 'cancelled' ? 'error' : 'process'}
              style={{ marginBottom: 24 }}
            >
              <Step title="待处理" description="用户提交兑换" />
              <Step title="已确认" description="管理员确认订单" />
              <Step title="已发货" description="商品已发出" />
              <Step title="已完成" description="兑换完成" />
            </Steps>

            {/* 基本信息 */}
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="兑换单号" span={2}>
                <Text code>{selectedExchange.exchange_no}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                <Text code>{selectedExchange.user_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="商品名称">
                {selectedExchange.product_name}
              </Descriptions.Item>
              <Descriptions.Item label="兑换数量">
                {selectedExchange.quantity}
              </Descriptions.Item>
              <Descriptions.Item label="使用积分">
                <Text strong style={{ color: '#1890ff' }}>
                  {selectedExchange.points_used?.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                {getStatusTag(selectedExchange.status)}
              </Descriptions.Item>
              <Descriptions.Item label="兑换时间">
                {dayjs(selectedExchange.exchange_date).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {/* 收货信息 */}
            <Card title="收货信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="收货人">
                  {selectedExchange.contact_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  {selectedExchange.contact_phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="收货地址">
                  {selectedExchange.shipping_address || '-'}
                </Descriptions.Item>
                {selectedExchange.tracking_number && (
                  <Descriptions.Item label="物流单号">
                    <Text code>{selectedExchange.tracking_number}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 时间记录 */}
            <Card title="时间记录" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="兑换时间"
                    value={dayjs(selectedExchange.exchange_date).format('MM-DD HH:mm')}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                {selectedExchange.confirmed_at && (
                  <Col span={6}>
                    <Statistic
                      title="确认时间"
                      value={dayjs(selectedExchange.confirmed_at).format('MM-DD HH:mm')}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                )}
                {selectedExchange.shipped_at && (
                  <Col span={6}>
                    <Statistic
                      title="发货时间"
                      value={dayjs(selectedExchange.shipped_at).format('MM-DD HH:mm')}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                )}
                {selectedExchange.completed_at && (
                  <Col span={6}>
                    <Statistic
                      title="完成时间"
                      value={dayjs(selectedExchange.completed_at).format('MM-DD HH:mm')}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                )}
              </Row>
            </Card>

            {/* 备注信息 */}
            {selectedExchange.remark && (
              <Card title="备注信息" size="small">
                <Text>{selectedExchange.remark}</Text>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* 状态更新弹窗 */}
      <Modal
        title="更新订单状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleStatusUpdate}
        >
          <Form.Item
            name="status"
            label="订单状态"
            rules={[{ required: true, message: '请选择订单状态' }]}
          >
            <Select placeholder="选择订单状态">
              <Option value="pending">待处理</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tracking_number"
            label="物流单号"
          >
            <Input placeholder="请输入物流单号（发货时填写）" />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStatusModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新状态
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量状态更新弹窗 */}
      <Modal
        title={`批量更新订单状态 (已选${selectedRowKeys.length}条)`}
        open={batchStatusModalVisible}
        onCancel={() => setBatchStatusModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={batchStatusForm}
          layout="vertical"
          onFinish={handleBatchStatusUpdate}
        >
          <Form.Item
            name="status"
            label="订单状态"
            rules={[{ required: true, message: '请选择订单状态' }]}
          >
            <Select placeholder="选择订单状态">
              <Option value="pending">待处理</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tracking_number"
            label="物流单号"
          >
            <Input placeholder="请输入物流单号（发货时填写）" />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setBatchStatusModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                批量更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExchangeManagement;
