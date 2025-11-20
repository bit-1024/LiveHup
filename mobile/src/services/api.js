import axios from 'axios';
import { Toast } from 'react-vant';
import { authStorage } from '../utils/authStorage';

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：附带 token、显示 loading
api.interceptors.request.use(
  (config) => {
    if (config.showLoading !== false) {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0,
      });
    }
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    Toast.clear();
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理错误、401 登出
api.interceptors.response.use(
  (response) => {
    Toast.clear();
    const { data } = response;
    if (data.success === false) {
      Toast.fail(data.message || '请求失败');
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (error) => {
    Toast.clear();
    const { response } = error;
    if (response) {
      const { status, data } = response;
      if (status === 401) {
        authStorage.clear();
        Toast.fail(data?.message || '登录已失效，请重新登录');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      } else if (status === 404) {
        Toast.fail('请求资源不存在');
      } else if (status === 500) {
        Toast.fail('服务器内部错误');
      } else {
        Toast.fail(data?.message || '请求出错');
      }
    } else {
      Toast.fail('网络连接失败');
    }
    return Promise.reject(error);
  }
);

// 用户认证 API
export const authAPI = {
  login: (data) => api.post('/user-auth/login', data),
  getProfile: () => api.get('/user-auth/profile', { showLoading: false }),
  getSummary: () => api.get('/user-auth/points/summary', { showLoading: false }),
  changePassword: (data) => api.post('/user-auth/change-password', data),
};

// 用户 API（仅自查）
export const userAPI = {
  getPoints: (userId) => api.get(`/users/${userId}/points`, { showLoading: false }),
  getInfo: (userId) => api.get(`/users/${userId}`, { showLoading: false }),
};

// 商品 API
export const productAPI = {
  getList: (params) =>
    api.get('/products', {
      params: { ...params, is_active: true },
      showLoading: false,
    }),
  getDetail: (id) => api.get(`/products/${id}`, { showLoading: false }),
};

// 兑换 API（绑定当前登录用户）
export const exchangeAPI = {
  create: (data) => api.post('/exchanges', data),
  getMyExchanges: (params = {}) =>
    api.get('/exchanges', {
      params,
      showLoading: false,
    }),
  getDetail: (id) => api.get(`/exchanges/${id}`, { showLoading: false }),
};

// 积分记录 API（绑定当前登录用户）
export const pointsAPI = {
  getRecords: (userId, params) =>
    api.get('/points/records', {
      params: { ...params, user_id: userId },
      showLoading: false,
    }),
};

// 辅助函数
export const utils = {
  buildImageUrl: (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const baseUrl = process.env.REACT_APP_BASE_URL || 'http://188.239.18.147:3000';
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  },

  formatNumber: (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  formatDate: (date, format = 'YYYY-MM-DD') => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute);
  },

  getStatusText: (status) => {
    const statusMap = {
      pending: '待处理',
      confirmed: '已确认',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  },

  getStatusColor: (status) => {
    const colorMap = {
      pending: '#ff976a',
      confirmed: '#1989fa',
      shipped: '#ff976a',
      completed: '#07c160',
      cancelled: '#ee0a24',
    };
    return colorMap[status] || '#969799';
  },

  isWeChat: () => /micromessenger/i.test(navigator.userAgent),
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

  copyToClipboard: (text) => {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => {
        Toast.success('复制成功');
      }).catch(() => {
        Toast.fail('复制失败');
      });
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      Toast.success('复制成功');
    } catch (err) {
      Toast.fail('复制失败');
    }
    document.body.removeChild(textArea);
  },

  share: (data) => {
    if (navigator.share) {
      return navigator.share(data);
    }
    if (data.url) {
      return utils.copyToClipboard(data.url);
    }
    Toast.fail('当前环境不支持分享');
  },
};

export default api;
