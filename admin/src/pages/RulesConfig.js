import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Switch, 
  Space, 
  Typography, 
  Tag, 
  Popconfirm,
  message,
  Alert,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { rulesAPI } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const RulesConfig = () => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRules();
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      const response = await rulesAPI.getColumns();
      setAvailableColumns(response.data || []);
    } catch (error) {
      console.error('获取列名失败:', error);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await rulesAPI.getList();
      setRules(response.data);
    } catch (error) {
      console.error('获取规则列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 0,
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRule(record);
    form.setFieldsValue({
      ...record,
      validity_days: record.validity_days || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await rulesAPI.delete(id);
      message.success('删除成功');
      fetchRules();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await rulesAPI.toggle(id, isActive);
      message.success(isActive ? '启用成功' : '禁用成功');
      fetchRules();
    } catch (error) {
      console.error('状态切换失败:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      // 处理列名：如果是数组，取第一个元素
      const submitData = {
        ...values,
        column_name: Array.isArray(values.column_name)
          ? values.column_name[0]
          : values.column_name
      };
      
      if (editingRule) {
        await rulesAPI.update(editingRule.id, submitData);
        message.success('更新成功');
      } else {
        await rulesAPI.create(submitData);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchRules();
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const conditionTypes = [
    { value: 'equals', label: '等于' },
    { value: 'not_equals', label: '不等于' },
    { value: 'greater_than', label: '大于' },
    { value: 'greater_or_equal', label: '大于等于' },
    { value: 'less_than', label: '小于' },
    { value: 'less_or_equal', label: '小于等于' },
    { value: 'contains', label: '包含' },
    { value: 'range', label: '范围内' },
  ];

  const getConditionTypeText = (type) => {
    const item = conditionTypes.find(t => t.value === type);
    return item ? item.label : type;
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'rule_name',
      key: 'rule_name',
      width: 150,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '列名',
      dataIndex: 'column_name',
      key: 'column_name',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '条件',
      key: 'condition',
      width: 200,
      render: (_, record) => (
        <div>
          <Text type="secondary">{getConditionTypeText(record.condition_type)}</Text>
          <br />
          <Text code>{record.condition_value}</Text>
        </div>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value > 0 ? '+' : ''}{value}
        </Text>
      ),
    },
    {
      title: '有效期',
      dataIndex: 'validity_days',
      key: 'validity_days',
      width: 100,
      render: (value) => (
        value ? `${value}天` : <Tag color="green">永久</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center',
      render: (value) => <Tag color="orange">{value}</Tag>,
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
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
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
            title="确定要删除这个规则吗？"
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
        <Title level={3} className="page-title">积分规则配置</Title>
        <p className="page-description">
          配置根据数据列条件自动分配积分的规则
        </p>
      </div>

      <Card className="content-card" style={{ marginBottom: 24 }}>
        <Alert
          message="规则说明"
          description={
            <div>
              <p>• 规则按优先级从高到低执行，数字越大优先级越高</p>
              <p>• 同一行数据可以匹配多个规则，会累加积分</p>
              <p>• <strong>时长判定</strong>：系统自动识别"直播观看时长"等时长字段，支持"0小时12分27秒"等格式，条件值输入分钟数即可（如：30表示30分钟）</p>
              <p>• 范围条件格式：最小值,最大值（如：10,100表示10到100分钟）</p>
              <p>• 积分有效期为空表示永久有效</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Card>

      <Card 
        title={
          <Space>
            <SettingOutlined />
            积分规则列表
          </Space>
        }
        className="content-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增规则
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条规则`,
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑规则' : '新增规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: 0,
            is_active: true,
          }}
        >
          <Form.Item
            name="rule_name"
            label="规则名称"
            rules={[
              { required: true, message: '请输入规则名称' },
              { max: 100, message: '规则名称不能超过100个字符' }
            ]}
          >
            <Input placeholder="如：观看时长达标" />
          </Form.Item>

          <Form.Item
            name="column_name"
            label="列名"
            rules={[{ required: true, message: '请选择或输入列名' }]}
            extra="从导入文件中选择列名，或手动输入"
          >
            <Select
              showSearch
              placeholder="选择列名（如：直播观看时长）"
              optionFilterProp="children"
              mode="tags"
              maxTagCount={1}
              allowClear
            >
              {availableColumns.map(col => (
                <Option key={col} value={col}>{col}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="condition_type"
            label="条件类型"
            rules={[{ required: true, message: '请选择条件类型' }]}
          >
            <Select placeholder="选择条件类型">
              {conditionTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="condition_value"
            label="条件值"
            rules={[{ required: true, message: '请输入条件值' }]}
            extra="时长类型输入分钟数（如：30表示30分钟），范围用逗号分隔（如：10,100）"
          >
            <Input placeholder="如：30（30分钟）、是（文本）、10,100（范围）" />
          </Form.Item>

          <Form.Item
            name="points"
            label="积分值"
            rules={[
              { required: true, message: '请输入积分值' },
              { type: 'number', min: -9999, max: 9999, message: '积分值范围：-9999 到 9999' }
            ]}
          >
            <InputNumber 
              style={{ width: '100%' }}
              placeholder="正数为奖励，负数为扣除"
            />
          </Form.Item>

          <Form.Item
            name="validity_days"
            label="有效期（天）"
            extra="留空表示永久有效"
          >
            <InputNumber 
              style={{ width: '100%' }}
              min={1}
              max={3650}
              placeholder="如：30"
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请输入优先级' }]}
          >
            <InputNumber 
              style={{ width: '100%' }}
              min={0}
              max={999}
              placeholder="数字越大优先级越高"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="规则说明"
          >
            <Input.TextArea 
              rows={3}
              placeholder="详细说明这个规则的作用和条件"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRule ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RulesConfig;