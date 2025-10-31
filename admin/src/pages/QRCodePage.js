import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Space, 
  Typography, 
  Row, 
  Col,
  message,
  Spin,
  Alert,
  Divider
} from 'antd';
import { 
  QrcodeOutlined, 
  DownloadOutlined,
  CopyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { qrcodeAPI } from '../services/api';

// Fixed: Remove unused 'Paragraph' variable
const { Title, Text } = Typography;

const QRCodePage = () => {
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mobileUrl, setMobileUrl] = useState('');
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async (text = '') => {
    try {
      setLoading(true);
      const response = await qrcodeAPI.generate({
        text: text || undefined,
        size: 300,
      });
      setQrCodeUrl(response.data.qrcode);
      setMobileUrl(response.data.url);
    } catch (error) {
      console.error('生成二维码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    generateQRCode(customText);
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `积分查询二维码_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('二维码下载成功');
  };

  const handleCopyUrl = () => {
    if (!mobileUrl) return;
    
    navigator.clipboard.writeText(mobileUrl).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请手动复制');
    });
  };

  return (
    <div>
      <div className="page-header">
        <Title level={3} className="page-title">二维码生成</Title>
        <p className="page-description">
          生成用户积分查询二维码，用户扫码后可查询个人积分
        </p>
      </div>

      <Row gutter={24}>
        {/* 二维码生成 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <QrcodeOutlined />
                二维码生成
              </Space>
            }
            className="content-card"
          >
            <Alert
              message="使用说明"
              description={
                <div>
                  <p>• 用户扫描二维码后将跳转到手机端积分查询页面</p>
                  <p>• 可以自定义二维码中的提示文字</p>
                  <p>• 生成的二维码可以下载保存或直接分享</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <div style={{ marginBottom: 24 }}>
              <Text strong>自定义文字（可选）：</Text>
              <Input
                placeholder="如：扫码查询您的积分余额"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                style={{ marginTop: 8, marginBottom: 16 }}
                maxLength={100}
              />
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={handleGenerate}
                loading={loading}
                block
              >
                生成二维码
              </Button>
            </div>

            <Divider />

            {/* 二维码显示 */}
            <div style={{ textAlign: 'center' }}>
              {loading ? (
                <div style={{ padding: '60px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">正在生成二维码...</Text>
                  </div>
                </div>
              ) : qrCodeUrl ? (
                <div>
                  <div style={{ 
                    display: 'inline-block',
                    padding: 20,
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    marginBottom: 24
                  }}>
                    <img 
                      src={qrCodeUrl} 
                      alt="积分查询二维码" 
                      style={{ display: 'block', maxWidth: '100%' }}
                    />
                  </div>
                  
                  <div>
                    <Space>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                      >
                        下载二维码
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => generateQRCode(customText)}
                        loading={loading}
                      >
                        重新生成
                      </Button>
                    </Space>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '60px 0', color: '#8c8c8c' }}>
                  <QrcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>点击上方按钮生成二维码</div>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 链接信息 */}
        <Col xs={24} lg={12}>
          <Card 
            title="链接信息"
            className="content-card"
            style={{ marginBottom: 24 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong>手机端链接：</Text>
              <div style={{ 
                marginTop: 8,
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 6,
                wordBreak: 'break-all',
                fontSize: 12,
                fontFamily: 'monospace'
              }}>
                {mobileUrl || '生成二维码后显示链接'}
              </div>
              {mobileUrl && (
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={handleCopyUrl}
                  style={{ padding: 0, marginTop: 8 }}
                >
                  复制链接
                </Button>
              )}
            </div>

            <Divider />

            <div>
              <Text strong>分享方式：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>将二维码图片保存并分享到微信群或朋友圈</li>
                <li>直接复制链接发送给用户</li>
                <li>打印二维码贴在活动现场</li>
                <li>在直播间展示二维码供观众扫描</li>
              </ul>
            </div>
          </Card>

          <Card 
            title="使用统计"
            className="content-card"
          >
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>
                    -
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                    今日扫码次数
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
                    -
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                    总扫码次数
                  </div>
                </div>
              </Col>
            </Row>
            
            <Alert
              message="统计功能开发中"
              description="后续版本将提供详细的扫码统计数据"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QRCodePage;