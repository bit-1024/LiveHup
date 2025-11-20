import React, { useState } from 'react';
import { Button, Field, Form, Toast } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await authAPI.login({
        identifier: values.identifier?.trim(),
        password: values.password,
      });
      login(response.data.token, response.data.user);
      Toast.success('登录成功');
      navigate('/home', { replace: true });
    } catch (error) {
      Toast.fail(error?.response?.data?.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 16,
        padding: '32px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#007AFF' }}>
            积分管理系统
          </div>
          <div style={{ color: '#8c8c8c', marginTop: 8, whiteSpace: 'nowrap' }}>
            使用 用户名/ID + 密码 登录
          </div>
        </div>

        <Form onFinish={handleSubmit}>
          <Form.Item
            name="identifier"
            rules={[{ required: true, message: '请输入用户名或ID' }]}
          >
            <Field
             label="用户名/ID"
             placeholder="请输入用户名或ID"
             maxLength={50}
             clearable
           />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Field
              label="密码"
              type="password"
              placeholder="请输入密码"
              clearable
            />
          </Form.Item>

          <Button
            block
            type="primary"
            round
            loading={loading}
            nativeType="submit"
            style={{ marginTop: 24 }}
          >
            登录
          </Button>

          <div style={{ marginTop: 16, fontSize: 12, color: '#969799', textAlign: 'center', whiteSpace: 'nowrap' }}>
            默认密码为 123456，首次登录后请及时修改密码
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
