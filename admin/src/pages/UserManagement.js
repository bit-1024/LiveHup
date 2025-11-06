import React, { useState, useEffect, useCallback } from 'react';
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
  Statistic,
  Row,
  Col,
  message,
  Tooltip,
  DatePicker
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserOutlined,
  TrophyOutlined,
  ReloadOutlined,
  ClearOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { usersAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const INITIAL_FILTERS = {
  keyword: '',
  userType: '',
  dateRange: null,
};

const UserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS }));
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPoints, setUserPoints] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 拉取用户列表，允许传入覆盖参数以支撑重置逻辑
  const fetchUsers = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const { page, pageSize, filters: overrideFilters } = options;
      const currentPage = page ?? pagination.current;
      const currentPageSize = pageSize ?? pagination.pageSize;
      const activeFilters = overrideFilters ?? filters;
      
      const params = {
        page: currentPage,
        pageSize: currentPageSize,
        keyword: activeFilters.keyword || undefined,
        userType: activeFilters.userType || undefined,
        startDate: activeFilters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: activeFilters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      
      const response = await usersAPI.getList(params);
      setUsers(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showUserDetail = async (user) => {
    setSelectedUser(user);
    setDetailVisible(true);
    
    // 获取用户积分详情
    try {
      setPointsLoading(true);
      const response = await usersAPI.getPoints(user.user_id);
      setUserPoints(response.data.records || []);
    } catch (error) {
      console.error('获取用户积分详情失败:', error);
      setUserPoints([]);
    } finally {
      setPointsLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUsers({ page: 1 });
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置所有用户积分',
      content: '此操作将清空所有用户的积分记录，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await usersAPI.resetAllPoints();
          message.success('所有用户积分重置成功');
          fetchUsers();
        } catch (error) {
          console.error('重置所有用户积分失败:', error);
        }
      },
    });
  };

  const handleExport = async () => {
    try {
      const params = {
        keyword: filters.keyword || undefined,
        userType: filters.userType || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      
      const response = await usersAPI.export(params);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `用户数据_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleResetPoints = async (userId) => {
    Modal.confirm({
      title: '确认重置积分',
      content: '此操作将清空该用户的所有积分记录，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await usersAPI.resetPoints(userId);
          message.success('积分重置成功');
          fetchUsers();
          if (detailVisible && selectedUser?.user_id === userId) {
            setDetailVisible(false);
          }
        } catch (error) {
          console.error('重置积分失败:', error);
        }
      },
    });
  };

  const handleDelete = async (userId) => {
    Modal.confirm({
      title: '确认删除用户',
      content: '此操作将删除该用户及其所有积分和兑换记录，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await usersAPI.delete(userId);
          message.success('用户删除成功');
          fetchUsers();
        } catch (error) {
          console.error('删除用户失败:', error);
        }
      },
    });
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    Modal.confirm({
      title: '确认批量删除用户',
      content: `此操作将删除 ${selectedRowKeys.length} 个用户及其所有积分和兑换记录，是否继续？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await usersAPI.batchDelete(selectedRowKeys);
          message.success(`成功删除 ${selectedRowKeys.length} 个用户`);
          setSelectedRowKeys([]);
          fetchUsers();
        } catch (error) {
          console.error('批量删除用户失败:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 150,
      render: (text) => (
        <Text code style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '用户类型',
      dataIndex: 'is_new_user',
      key: 'is_new_user',
      width: 100,
      render: (value) => (
        <Tag color={value ? 'green' : 'blue'}>
          {value ? '新用户' : '老用户'}
        </Tag>
      ),
    },
    {
      title: '总积分',
      dataIndex: 'total_points',
      key: 'total_points',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '可用积分',
      dataIndex: 'available_points',
      key: 'available_points',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#52c41a' }}>
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '已用积分',
      dataIndex: 'used_points',
      key: 'used_points',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text style={{ color: '#ff4d4f' }}>
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '过期积分',
      dataIndex: 'expired_points',
      key: 'expired_points',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text type="secondary">
          {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '首次导入',
      dataIndex: 'first_import_date',
      key: 'first_import_date',
      width: 120,
      render: (value) => (
        value ? dayjs(value).format('YYYY-MM-DD') : '-'
      ),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_date',
      key: 'last_active_date',
      width: 120,
      render: (value) => (
        value ? dayjs(value).format('YYYY-MM-DD') : '-'
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showUserDetail(record)}
            />
          </Tooltip>
          <Tooltip title="重置积分">
            <Button
              type="link"
              size="small"
              danger
              icon={<ClearOutlined />}
              onClick={() => handleResetPoints(record.user_id)}
            />
          </Tooltip>
          <Tooltip title="删除用户">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.user_id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 积分记录表格列
  const pointsColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '积分变动',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value > 0 ? '+' : ''}{value}
        </Text>
      ),
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      key: 'balance_after',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong>{value?.toLocaleString()}</Text>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (value) => {
        const sourceMap = {
          import: { color: 'blue', text: '导入' },
          exchange: { color: 'orange', text: '兑换' },
          manual: { color: 'green', text: '手动' },
          expire: { color: 'red', text: '过期' },
        };
        const config = sourceMap[value] || { color: 'default', text: value };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '过期日期',
      dataIndex: 'expire_date',
      key: 'expire_date',
      width: 120,
      render: (value) => (
        value ? dayjs(value).format('YYYY-MM-DD') : '-'
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">用户管理</Title>
        <p className="page-description">
          查看和管理所有用户的积分信息
        </p>
      </div>

      {/* 搜索筛选 */}
      <Card className="content-card" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="搜索用户ID或用户名"
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="用户类型"
              value={filters.userType}
              onChange={(value) => setFilters(prev => ({ ...prev, userType: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="new">新用户</Option>
              <Option value="old">老用户</Option>
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
                onClick={fetchUsers}
              >
                刷新
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 用户列表 */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            用户列表
          </Space>
        }
        className="content-card"
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="user_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个用户`,
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

      {/* 用户详情弹窗 */}
      <Modal
        title="用户详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedUser && (
          <div>
            {/* 用户基本信息 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="总积分"
                  value={selectedUser.total_points}
                  prefix={<TrophyOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="可用积分"
                  value={selectedUser.available_points}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已用积分"
                  value={selectedUser.used_points}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="过期积分"
                  value={selectedUser.expired_points}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Col>
            </Row>

            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="用户ID">
                <Text code>{selectedUser.user_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="用户名">
                {selectedUser.username || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                {selectedUser.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户类型">
                <Tag color={selectedUser.is_new_user ? 'green' : 'blue'}>
                  {selectedUser.is_new_user ? '新用户' : '老用户'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="首次导入">
                {selectedUser.first_import_date ?
                  dayjs(selectedUser.first_import_date).format('YYYY-MM-DD HH:mm') :
                  '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="最后活跃">
                {selectedUser.last_active_date ?
                  dayjs(selectedUser.last_active_date).format('YYYY-MM-DD HH:mm') :
                  '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(selectedUser.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {/* 积分记录 */}
            <Card
              title={
                <Space>
                  <TrophyOutlined />
                  积分记录
                </Space>
              }
              size="small"
            >
              <Table
                columns={pointsColumns}
                dataSource={userPoints}
                rowKey="id"
                loading={pointsLoading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
                size="small"
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
