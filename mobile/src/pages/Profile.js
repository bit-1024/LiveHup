import React, { useState } from 'react';
import { NavBar, Cell, Button, Form, Field, Toast, Dialog } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Dialog.confirm({
      title: '提示',
      message: '确认要退出登录吗？',
    }).then(() => {
      logout();
      navigate('/login', { replace: true });
    }).catch(() => {});
  };

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
    } catch (error) {
      Toast.fail(error?.response?.data?.message || '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <NavBar 
        title="个人中心" 
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 个人信息卡片 */}
        <div className="card" style={{
          background: '#007AFF',
          color: 'white',
          padding: '24px 16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '28px'
            }}>
              <Icon name="user-o" />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: 4 }}>
                {user?.username || user?.user_id || '匿名用户'}
              </div>
              <div style={{ fontSize: 15, opacity: 0.9 }}>
                ID: {user?.user_id || '-'}
              </div>
            </div>
          </div>
          
          <Button
            size="small"
            round
            style={{
              background: 'white',
              border: 'none',
              color: '#007AFF',
              fontWeight: 500
            }}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>

        {/* 修改密码 */}
        <div className="card">
          <div className="card-header">修改密码</div>
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

        {/* 功能入口 */}
        <div className="card">
          <div className="card-header">常用功能</div>
          <Cell.Group inset={false}>
            <Cell
              title="查看积分"
              label="查看当前账号积分明细"
              icon={<Icon name="point-gift-o" color="#007AFF" />}
              isLink
              onClick={() => navigate('/points-query')}
            />
            <Cell
              title="兑换记录"
              label="查看当前账号的兑换记录"
              icon={<Icon name="orders-o" color="#007AFF" />}
              isLink
              onClick={() => navigate('/exchange-record')}
            />
          </Cell.Group>
        </div>
      </div>
    </div>
  );
};

export default Profile;
