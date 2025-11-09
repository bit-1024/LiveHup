import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, message, Space } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';

const SystemSettings = () => {
  const [form] = Form.useForm();
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('systemSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      form.setFieldsValue({ systemName: settings.systemName });
      setLogoUrl(settings.logoUrl);
    }
  }, [form]);

  const handleLogoUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target.result);
      message.success('Logo上传成功');
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const settings = {
        systemName: values.systemName || '社群直播积分系统',
        logoUrl: logoUrl
      };
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      message.success('设置保存成功，刷新页面后生效');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('systemSettings');
    form.resetFields();
    setLogoUrl(null);
    message.success('已恢复默认设置，刷新页面后生效');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="系统设置" style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="系统名称"
            name="systemName"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input placeholder="社群直播积分系统" />
          </Form.Item>

          <Form.Item label="系统Logo">
            <Space direction="vertical" style={{ width: '100%' }}>
              {logoUrl && (
                <div style={{ marginBottom: 16 }}>
                  <img src={logoUrl} alt="Logo预览" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                </div>
              )}
              <Upload
                accept="image/*"
                beforeUpload={handleLogoUpload}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>上传Logo</Button>
              </Upload>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                建议尺寸：100x100像素，支持PNG、JPG格式
              </div>
            </Space>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
              <Button onClick={handleReset}>恢复默认</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemSettings;