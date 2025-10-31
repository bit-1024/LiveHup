import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Upload, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Typography, 
  Space, 
  message, 
  Modal,
  Descriptions,
  Alert,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  UploadOutlined, 
  FileExcelOutlined, 
  EyeOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { importAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const DataImport = () => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fixed: Wrap fetchHistory in useCallback
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await importAPI.getHistory({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setHistory(response.data.list);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
      }));
    } catch (error) {
      console.error('获取导入历史失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpload = async (file) => {
    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!allowedTypes.includes(file.type)) {
      message.error('只支持 Excel (.xlsx, .xls) 和 CSV 格式文件');
      return false;
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过 10MB');
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      // Fixed: Remove unused 'response' variable
      await importAPI.upload(formData);
      message.success('文件上传成功，正在处理数据...');
      
      // 刷新历史记录
      setTimeout(() => {
        fetchHistory();
      }, 1000);
      
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }

    return false; // 阻止默认上传行为
  };

  const showDetail = async (record) => {
    try {
      const response = await importAPI.getDetail(record.batch_id);
      setSelectedRecord(response.data);
      setDetailVisible(true);
    } catch (error) {
      console.error('获取详情失败:', error);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      processing: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
      partial: { color: 'warning', text: '部分成功' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batch_id',
      key: 'batch_id',
      width: 200,
      render: (text) => (
        <Text code style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (text) => (
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          {text}
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size) => {
        if (!size) return '-';
        const kb = size / 1024;
        const mb = kb / 1024;
        return mb > 1 ? `${mb.toFixed(1)}MB` : `${kb.toFixed(1)}KB`;
      },
    },
    {
      title: '总行数',
      dataIndex: 'total_rows',
      key: 'total_rows',
      width: 80,
      align: 'right',
    },
    {
      title: '成功/失败',
      key: 'success_rate',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ color: '#52c41a', fontSize: 12 }}>
            成功: {record.success_rows}
          </div>
          {record.failed_rows > 0 && (
            <div style={{ color: '#ff4d4f', fontSize: 12 }}>
              失败: {record.failed_rows}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '新用户',
      dataIndex: 'new_users',
      key: 'new_users',
      width: 80,
      align: 'right',
      render: (value) => (
        <Tag color="blue">{value}</Tag>
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
      title: '状态',
      dataIndex: 'import_status',
      key: 'import_status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '导入时间',
      dataIndex: 'import_date',
      key: 'import_date',
      width: 160,
      render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
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
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">数据导入</Title>
        <p className="page-description">
          支持导入 Excel (.xlsx, .xls) 和 CSV 格式的直播数据文件
        </p>
      </div>

      {/* 上传区域 */}
      <Card className="content-card" style={{ marginBottom: 24 }}>
        <Alert
          message="导入说明"
          description={
            <div>
              <p>• 文件必须包含用户ID列，系统将以第一次导入的用户ID为准识别新老用户</p>
              <p>• 支持的文件格式：Excel (.xlsx, .xls) 和 CSV</p>
              <p>• 文件大小限制：10MB</p>
              <p>• 系统会根据配置的积分规则自动计算并分配积分</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />

        <Dragger
          name="file"
          multiple={false}
          beforeUpload={handleUpload}
          showUploadList={false}
          className="upload-area"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint">
            支持 Excel (.xlsx, .xls) 和 CSV 格式，文件大小不超过 10MB
          </p>
        </Dragger>

        {uploading && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Progress percent={100} status="active" showInfo={false} />
            <Text type="secondary">正在上传并处理文件，请稍候...</Text>
          </div>
        )}
      </Card>

      {/* 导入历史 */}
      <Card 
        title="导入历史" 
        className="content-card"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchHistory}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={history}
          rowKey="batch_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
              }));
            },
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="导入详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="总行数"
                  value={selectedRecord.total_rows}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功行数"
                  value={selectedRecord.success_rows}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="失败行数"
                  value={selectedRecord.failed_rows}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="新用户数"
                  value={selectedRecord.new_users}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="批次号" span={2}>
                <Text code>{selectedRecord.batch_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="文件名">
                {selectedRecord.filename}
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {selectedRecord.file_size ? 
                  `${(selectedRecord.file_size / 1024 / 1024).toFixed(2)}MB` : 
                  '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="总积分">
                <Text strong style={{ color: '#1890ff' }}>
                  {selectedRecord.total_points?.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedRecord.import_status)}
              </Descriptions.Item>
              <Descriptions.Item label="导入时间">
                {dayjs(selectedRecord.import_date).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {selectedRecord.completed_at ? 
                  dayjs(selectedRecord.completed_at).format('YYYY-MM-DD HH:mm:ss') : 
                  '-'
                }
              </Descriptions.Item>
              {selectedRecord.error_message && (
                <Descriptions.Item label="错误信息" span={2}>
                  <Text type="danger">{selectedRecord.error_message}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DataImport;