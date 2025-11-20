import React, { useState } from 'react';
import { NavBar, Button, Form, Field, Toast } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { authAPI } from '../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      Toast.fail('两次输入的新密码不一致');
      return;
    }
    try {
      setLoading(true);
      await authAPI.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      Toast.success('密码修改成功');
      form.resetFields();
      setTimeout(() => navigate(-1), 1000);
    } catch (error) {
      Toast.fail(error?.response?.data?.message || '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <NavBar 
        title="修改密码" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        <div className="card">
          <Form form={form} layout="vertical" onFinish={handleChangePassword}>
            <Form.Item
              name="oldPassword"
              label="原密码"
              rules={[{ required: true, message: '请输入原密码' }]}
            >
              <Field type="password" placeholder="请输入原密码" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '新密码长度不能少于6位' }]}
            >
              <Field type="password" placeholder="至少 6 位，包含字母或数字" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              rules={[{ required: true, message: '请再次输入新密码' }]}
            >
              <Field type="password" placeholder="请再次输入新密码" />
            </Form.Item>
            <Button
              type="primary"
              block
              loading={loading}
              nativeType="submit"
            >
              保存密码
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;