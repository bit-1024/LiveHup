import axios from 'axios';
import { Toast } from 'react-vant';

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
    // 显示加载提示
    if (config.showLoading !== false) {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0,
      });
    }
    return config;
  },
  (error) => {
    Toast.clear();
    return Promise.reject(error);
  }
);

// 响应拦截器
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
      switch (status) {
        case 404:
          Toast.fail('请求的资源不存在');
          break;
        case 500:
          Toast.fail('服务器内部错误');
          break;
        default:
          Toast.fail(data?.message || '网络错误');
      }
    } else {
      Toast.fail('网络连接失败');
    }
    return Promise.reject(error);
  }
);

// 用户相关API
export const userAPI = {
  // 获取用户积分信息
  getPoints: (userId) => api.get(`/users/${userId}/points`, { showLoading: false }),
  
  // 获取用户基本信息
  getInfo: (userId) => api.get(`/users/${userId}`, { showLoading: false }),
};

// 商品相关API
export const productAPI = {
  // 获取商品列表
  getList: (params) => api.get('/products', { 
    params: { ...params, is_active: true },
    showLoading: false 
  }),
  
  // 获取商品详情
  getDetail: (id) => api.get(`/products/${id}`, { showLoading: false }),
};

// 兑换相关API
export const exchangeAPI = {
  // 创建兑换订单
  create: (data) => api.post('/exchanges', data),
  
  // 获取用户兑换记录
  getMyExchanges: (searchValue, params) => {
    const queryParams = { ...params };
    // 判断是用户ID还是用户名（简单判断：纯数字为ID，否则为用户名）
    if (/^\d+$/.test(searchValue)) {
      queryParams.user_id = searchValue;
    } else {
      queryParams.user_name = searchValue;
    }
    return api.get('/exchanges', {
      params: queryParams,
      showLoading: false
    });
  },
  
  // 获取兑换详情
  getDetail: (id) => api.get(`/exchanges/${id}`, { showLoading: false }),
};

// 积分记录API
export const pointsAPI = {
  // 获取积分记录
  getRecords: (userId, params) => api.get('/points/records', { 
    params: { ...params, user_id: userId },
    showLoading: false 
  }),
};

// 工具函数
export const utils = {
  // 构建图片URL
  buildImageUrl: (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  },
  
  // 格式化数字
  formatNumber: (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },
  
  // 格式化日期
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
  
  // 获取状态文本
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
  
  // 获取状态颜色
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
  
  // 检查是否为微信环境
  isWeChat: () => {
    return /micromessenger/i.test(navigator.userAgent);
  },
  
  // 检查是否为移动设备
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // 复制到剪贴板
  copyToClipboard: (text) => {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => {
        Toast.success('复制成功');
      }).catch(() => {
        Toast.fail('复制失败');
      });
    } else {
      // 降级方案
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
    }
  },
  
  // 分享功能
  share: (data) => {
    if (navigator.share) {
      return navigator.share(data);
    } else {
      // 降级方案：复制链接
      if (data.url) {
        return utils.copyToClipboard(data.url);
      }
      Toast.fail('当前浏览器不支持分享功能');
    }
  },
};

export default api;
