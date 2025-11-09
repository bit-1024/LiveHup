import axios from 'axios';
import { message } from 'antd';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.success === false) {
      message.error(data.message || '请求失败');
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (error) => {
    const { response } = error;
    if (response) {
      const { status, data } = response;
      switch (status) {
        case 401:
          message.error('登录已过期，请重新登录');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          message.error('没有权限访问');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(data?.message || '网络错误');
      }
    } else {
      message.error('网络连接失败');
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

// 仪表盘API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// 数据导入API
export const importAPI = {
  upload: (formData) => api.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getHistory: (params) => api.get('/import/history', { params }),
  getDetail: (batchId) => api.get(`/import/detail/${batchId}`),
  clearHistory: () => api.delete('/import/history'),
};

// 积分规则API
export const rulesAPI = {
  getList: (params) => api.get('/rules', { params }),
  getColumns: () => api.get('/rules/columns'),
  create: (data) => api.post('/rules', data),
  update: (id, data) => api.put(`/rules/${id}`, data),
  delete: (id) => api.delete(`/rules/${id}`),
  toggle: (id, isActive) => api.put(`/rules/${id}`, { is_active: isActive }),
};

// 用户管理API
export const usersAPI = {
  getList: (params) => api.get('/users', { params }),
  getDetail: (userId) => api.get(`/users/${userId}`),
  getPoints: (userId) => api.get(`/users/${userId}/points`),
  updatePoints: (userId, data) => api.post(`/users/${userId}/points`, data),
  resetPoints: (userId) => api.post(`/users/${userId}/reset`),
  resetAllPoints: () => api.post('/users/reset-all/points'),
  export: (params) => api.get('/users/export', { params, responseType: 'blob' }),
  delete: (userId) => api.delete(`/users/${userId}`),
  batchDelete: (userIds) => api.post('/users/batch/delete', { userIds }),
};

// 商品管理API
export const productsAPI = {
  getList: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  toggle: (id, isActive) => api.put(`/products/${id}/toggle`, { is_active: isActive }),
  upload: (formData) => api.post('/products/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// 兑换管理API
export const exchangesAPI = {
  getList: (params) => api.get('/exchanges', { params }),
  getDetail: (id) => api.get(`/exchanges/${id}`),
  updateStatus: (id, status, data = {}) => api.put(`/exchanges/${id}/status`, { status, ...data }),
  batchUpdateStatus: (data) => api.put('/exchanges/batch/status', data),
  export: (params) => api.get('/exchanges/export', { params, responseType: 'blob' }),
};

// 二维码API
export const qrcodeAPI = {
  generate: (params) => api.get('/qrcode/generate', { params }),
};

// 积分记录API
export const pointsAPI = {
  getRecords: (params) => api.get('/points/records', { params }),
  getExpiring: (params) => api.get('/points/expiring', { params }),
  processExpired: () => api.post('/points/process-expired'),
};

export default api;