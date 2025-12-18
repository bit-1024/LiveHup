// {{CODE-Cycle-Integration:
//   Task_ID: [#T012]
//   Timestamp: 2025-12-17T01:58:14Z
//   Phase: D-Develop
//   Context-Analysis: "更新Dashboard页面，集成骨架屏和请求取消机制"
//   Principle_Applied: "State-Management, Request-Cancellation, Skeleton-Loading"
// }}
// {{START_MODIFICATIONS}}

import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Empty } from 'antd';
import { 
  UserOutlined, 
  TrophyOutlined, 
  ShopOutlined, 
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useDashboardStore } from '../store';
import { useAbortController } from '../hooks';
import { DashboardSkeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

const { Title } = Typography;

const Dashboard = () => {
  // 使用Zustand store
  const { 
    stats, 
    loading, 
    error, 
    fetchStats,
    clearError 
  } = useDashboardStore();
  
  // 使用请求取消hook
  const { getSignal } = useAbortController();

  useEffect(() => {
    // 获取数据，传入signal用于取消请求
    const signal = getSignal();
    fetchStats(signal);
    
    // 清除错误状态
    return () => {
      clearError();
    };
  }, [fetchStats, getSignal, clearError]);

  // 显示骨架屏
  if (loading.stats) {
    return (
      <div>
        <div className="page-header">
          <Title level={3} className="page-title">仪表盘</Title>
          <p className="page-description">系统概览和数据统计</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // 显示错误或空状态
  if (error || !stats) {
    return (
      <div>
        <div className="page-header">
          <Title level={3} className="page-title">仪表盘</Title>
          <p className="page-description">系统概览和数据统计</p>
        </div>
        <div className="empty-container">
          <Empty description={error || "暂无数据"} />
        </div>
      </div>
    );
  }

  const { userStats, pointsStats, productStats, exchangeStats, recentImports } = stats;

  // 最近导入表格列配置
  const importColumns = [
    {
      title: '批次号',
      dataIndex: 'batch_id',
      key: 'batch_id',
      width: 200,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text}
        </span>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: '总行数',
      dataIndex: 'total_rows',
      key: 'total_rows',
      width: 80,
      align: 'right',
    },
    {
      title: '新用户',
      dataIndex: 'new_users',
      key: 'new_users',
      width: 80,
      align: 'right',
      render: (value) => (
        <Tag color="green">{value}</Tag>
      ),
    },
    {
      title: '总积分',
      dataIndex: 'total_points',
      key: 'total_points',
      width: 100,
      align: 'right',
      render: (value) => (
        <span style={{ color: '#1890ff', fontWeight: 600 }}>
          {value?.toLocaleString()}
        </span>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'import_date',
      key: 'import_date',
      width: 160,
      render: (value) => dayjs(value).format('MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">仪表盘</Title>
        <p className="page-description">系统概览和数据统计</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="content-card">
            <Statistic
              title="总用户数"
              value={userStats?.total_users || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  今日新增 {userStats?.todayNew || 0}
                </div>
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="content-card">
            <Statistic
              title="总积分"
              value={pointsStats?.total || 0}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  可用 {pointsStats?.available?.toLocaleString() || 0}
                </div>
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="content-card">
            <Statistic
              title="商品数量"
              value={productStats?.total_products || 0}
              prefix={<ShopOutlined style={{ color: '#faad14' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  在售 {productStats?.active_products || 0}
                </div>
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="content-card">
            <Statistic
              title="兑换订单"
              value={exchangeStats?.total_exchanges || 0}
              prefix={<SwapOutlined style={{ color: '#ff4d4f' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  待处理 {exchangeStats?.pending_count || 0}
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 今日数据 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="今日积分变动" 
            className="content-card"
            extra={
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {dayjs().format('YYYY-MM-DD')}
              </div>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="获得积分"
                  value={pointsStats?.earned || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<ArrowUpOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="消费积分"
                  value={pointsStats?.used || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<ArrowDownOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="用户统计" 
            className="content-card"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="新用户"
                  value={userStats?.new_users || 0}
                  valueStyle={{ color: '#1890ff' }}
                  suffix={`/ ${userStats?.total_users || 0}`}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="老用户"
                  value={(userStats?.total_users || 0) - (userStats?.new_users || 0)}
                  valueStyle={{ color: '#8c8c8c' }}
                  suffix={`/ ${userStats?.total_users || 0}`}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 最近导入 */}
      <Card 
        title="最近导入记录" 
        className="content-card"
        extra={
          <a href="/import" style={{ fontSize: 14 }}>
            查看全部
          </a>
        }
      >
        <Table
          columns={importColumns}
          dataSource={recentImports || []}
          rowKey="batch_id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无导入记录' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;

// {{END_MODIFICATIONS}}