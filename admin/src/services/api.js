// {{CODE-Cycle-Integration:
//   Task_ID: [#T010]
//   Timestamp: 2025-12-18T07:21:00Z
//   Phase: D-Develop
//   Context-Analysis: "修复API服务，解决401循环问题"
//   Principle_Applied: "Request-Cancellation, Auth-State-Sync"
// }}
// {{START_MODIFICATIONS}}

import axios from 'axios';
import { message } from 'antd';

// 标记是否正在处理401
let isHandling401 = false;

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
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
    // 忽略取消的请求，不显示错误消息
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.reject(error);
    }
    
    const { response, config } = error;
    if (response) {
      const { status, data } = response;
      switch (status) {
        case 401:
          // 如果是checkAuth请求（/auth/me），不显示消息，直接reject
          if (config.url?.includes('/auth/me')) {
            return Promise.reject(error);
          }
          
          // 防止多个401同时处理
          if (!isHandling401) {
            isHandling401 = true;
            message.error('登录已过期，请重新登录');
            
            // 使用动态导入避免循环依赖
            import('../store/authStore').then(({ forceLogout }) => {
              forceLogout();
              isHandling401 = false;
            }).catch(() => {
              // 如果导入失败，使用传统方式
              localStorage.removeItem('token');
              localStorage.removeItem('auth-storage');
              window.location.href = '/login';
              isHandling401 = false;
            });
          }
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

/**
 * 创建支持取消的请求方法
 * @param {Function} requestFn - 原始请求函数
 * @returns {Function} - 支持signal参数的请求函数
 */
const withSignal = (requestFn) => {
  return (...args) => {
    // 检查最后一个参数是否包含signal
    const lastArg = args[args.length - 1];
    if (lastArg && typeof lastArg === 'object' && lastArg.signal) {
      const { signal, ...restOptions } = lastArg;
      // 将signal添加到axios配置中
      const newArgs = args.slice(0, -1);
      return requestFn(...newArgs, { ...restOptions, signal });
    }
    return requestFn(...args);
  };
};

// 认证相关API
export const authAPI = {
  login: (data, config = {}) => api.post('/auth/login', data, config),
  register: (data, config = {}) => api.post('/auth/register', data, config),
  logout: (config = {}) => api.post('/auth/logout', {}, config),
  getCurrentUser: (config = {}) => api.get('/auth/me', config),
};

// 仪表盘API
export const dashboardAPI = {
  getStats: (config = {}) => api.get('/dashboard/stats', config),
  getChartData: (params, config = {}) => api.get('/dashboard/charts', { params, ...config }),
  getRecentActivities: (config = {}) => api.get('/dashboard/activities', config),
};

// 数据导入API
export const importAPI = {
  upload: (formData, config = {}) => api.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }),
  getHistory: (params, config = {}) => api.get('/import/history', { params, ...config }),
  getDetail: (batchId, config = {}) => api.get(`/import/detail/${batchId}`, config),
  clearHistory: (config = {}) => api.delete('/import/history', config),
};

// 积分规则API
export const rulesAPI = {
  getList: (params, config = {}) => api.get('/rules', { params, ...config }),
  getColumns: (config = {}) => api.get('/rules/columns', config),
  create: (data, config = {}) => api.post('/rules', data, config),
  update: (id, data, config = {}) => api.put(`/rules/${id}`, data, config),
  delete: (id, config = {}) => api.delete(`/rules/${id}`, config),
  toggle: (id, isActive, config = {}) => api.put(`/rules/${id}`, { is_active: isActive }, config),
};

// 用户管理API
export const usersAPI = {
  getList: (params, config = {}) => api.get('/users', { params, ...config }),
  getDetail: (userId, config = {}) => api.get(`/users/${userId}`, config),
  getPoints: (userId, config = {}) => api.get(`/users/${userId}/points`, config),
  updatePoints: (userId, data, config = {}) => api.post(`/users/${userId}/points`, data, config),
  resetPoints: (userId, config = {}) => api.post(`/users/${userId}/reset`, {}, config),
  resetAllPoints: (config = {}) => api.post('/users/reset-all/points', {}, config),
  export: (params, config = {}) => api.get('/users/export', { params, responseType: 'blob', ...config }),
  delete: (userId, config = {}) => api.delete(`/users/${userId}`, config),
  batchDelete: (userIds, config = {}) => api.post('/users/batch/delete', { userIds }, config),
  resetPassword: (userId, config = {}) => api.post(`/users/${userId}/password/reset`, {}, config),
  create: (data, config = {}) => api.post('/users', data, config),
  update: (id, data, config = {}) => api.put(`/users/${id}`, data, config),
  updateStatus: (id, status, config = {}) => api.put(`/users/${id}/status`, { status }, config),
};

// 商品管理API
export const productsAPI = {
  getList: (params, config = {}) => api.get('/products', { params, ...config }),
  getDetail: (id, config = {}) => api.get(`/products/${id}`, config),
  create: (data, config = {}) => api.post('/products', data, config),
  update: (id, data, config = {}) => api.put(`/products/${id}`, data, config),
  delete: (id, config = {}) => api.delete(`/products/${id}`, config),
  batchDelete: (ids, config = {}) => api.post('/products/batch/delete', { ids }, config),
  toggle: (id, isActive, config = {}) => api.put(`/products/${id}/toggle`, { is_active: isActive }, config),
  updateStatus: (id, status, config = {}) => api.put(`/products/${id}/status`, { status }, config),
  updateStock: (id, stock, config = {}) => api.put(`/products/${id}/stock`, { stock }, config),
  upload: (formData, config = {}) => api.post('/products/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }),
  uploadImage: (formData, config = {}) => api.post('/products/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }),
  getCategories: (config = {}) => api.get('/products/categories', config),
};

// 兑换管理API
export const exchangesAPI = {
  getList: (params, config = {}) => api.get('/exchanges', { params, ...config }),
  getDetail: (id, config = {}) => api.get(`/exchanges/${id}`, config),
  updateStatus: (id, data, config = {}) => api.put(`/exchanges/${id}/status`, data, config),
  batchUpdateStatus: (data, config = {}) => api.put('/exchanges/batch/status', data, config),
  export: (params, config = {}) => api.get('/exchanges/export', { params, responseType: 'blob', ...config }),
  getStatistics: (config = {}) => api.get('/exchanges/statistics', config),
};

// 二维码API
export const qrcodeAPI = {
  generate: (params, config = {}) => api.get('/qrcode/generate', { params, ...config }),
};

// 积分记录API
export const pointsAPI = {
  getRecords: (params, config = {}) => api.get('/points/records', { params, ...config }),
  getExpiring: (params, config = {}) => api.get('/points/expiring', { params, ...config }),
  processExpired: (config = {}) => api.post('/points/process-expired', {}, config),
};

// 系统设置API
export const settingsAPI = {
  get: (config = {}) => api.get('/settings', config),
  update: (data, config = {}) => api.put('/settings', data, config),
};

// {{END_MODIFICATIONS}}

export default api;
