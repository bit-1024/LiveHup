// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-17T01:46:42Z
//   Phase: D-Develop
//   Context-Analysis: "创建兑换记录管理状态store"
//   Principle_Applied: "State-Management, CRUD-Operations, Status-Management"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { exchangesAPI } from '../services/api';
import { message } from 'antd';

/**
 * 兑换记录管理状态
 * 管理兑换记录列表、分页、筛选、状态更新
 */
export const useExchangesStore = create((set, get) => ({
  // 兑换记录列表
  exchanges: [],
  
  // 当前选中的兑换记录
  selectedExchange: null,
  
  // 分页信息
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  },
  
  // 筛选条件
  filters: {
    keyword: '',
    status: undefined,
    dateRange: null,
    userId: undefined,
    productId: undefined
  },
  
  // 排序
  sorter: {
    field: 'created_at',
    order: 'descend'
  },
  
  // 统计数据
  statistics: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  },
  
  // 加载状态
  loading: false,
  
  // 操作加载状态
  actionLoading: false,
  
  // 统计加载状态
  statsLoading: false,
  
  // 错误信息
  error: null,
  
  // 获取兑换记录列表
  fetchExchanges: async (params = {}, signal) => {
    set({ loading: true, error: null });
    
    const { pagination, filters, sorter } = get();
    const requestParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...filters,
      sortField: sorter.field,
      sortOrder: sorter.order,
      ...params
    };
    
    try {
      const response = await exchangesAPI.getList(requestParams, { signal });
      set({
        exchanges: response.data.list || response.data,
        pagination: {
          ...pagination,
          total: response.data.total || response.data.length
        },
        loading: false
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({
          error: error.response?.data?.message || '获取兑换记录失败',
          loading: false
        });
      }
    }
  },
  
  // 获取兑换统计数据
  fetchStatistics: async (signal) => {
    set({ statsLoading: true });
    
    try {
      const response = await exchangesAPI.getStatistics({ signal });
      set({
        statistics: response.data,
        statsLoading: false
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ statsLoading: false });
        console.error('获取兑换统计失败:', error);
      }
    }
  },
  
  // 获取单个兑换记录详情
  fetchExchangeDetail: async (id, signal) => {
    set({ actionLoading: true });
    
    try {
      const response = await exchangesAPI.getDetail(id, { signal });
      set({
        selectedExchange: response.data,
        actionLoading: false
      });
      return response.data;
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ actionLoading: false });
        message.error(error.response?.data?.message || '获取兑换详情失败');
      }
      return null;
    }
  },
  
  // 更新兑换状态
  updateExchangeStatus: async (id, status, remark = '') => {
    set({ actionLoading: true });
    
    try {
      await exchangesAPI.updateStatus(id, { status, remark });
      
      const statusText = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        cancelled: '已取消'
      };
      
      message.success(`兑换状态已更新为: ${statusText[status] || status}`);
      set({ actionLoading: false });
      
      // 更新本地列表中的状态
      set((state) => ({
        exchanges: state.exchanges.map(exchange =>
          exchange.id === id ? { ...exchange, status, remark } : exchange
        )
      }));
      
      // 刷新统计数据
      get().fetchStatistics();
      
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '状态更新失败');
      return false;
    }
  },
  
  // 批量更新兑换状态
  batchUpdateStatus: async (ids, status) => {
    set({ actionLoading: true });
    
    try {
      await exchangesAPI.batchUpdateStatus({ ids, status });
      message.success(`成功更新 ${ids.length} 条记录状态`);
      set({ actionLoading: false });
      // 刷新列表
      get().fetchExchanges();
      // 刷新统计数据
      get().fetchStatistics();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '批量更新失败');
      return false;
    }
  },
  
  // 取消兑换
  cancelExchange: async (id, reason = '') => {
    return get().updateExchangeStatus(id, 'cancelled', reason);
  },
  
  // 完成兑换
  completeExchange: async (id, remark = '') => {
    return get().updateExchangeStatus(id, 'completed', remark);
  },
  
  // 开始处理兑换
  processExchange: async (id, remark = '') => {
    return get().updateExchangeStatus(id, 'processing', remark);
  },
  
  // 导出兑换记录
  exportExchanges: async (params = {}) => {
    set({ actionLoading: true });
    
    try {
      const { filters } = get();
      const response = await exchangesAPI.export({ ...filters, ...params });
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `兑换记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
      set({ actionLoading: false });
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '导出失败');
      return false;
    }
  },
  
  // 设置分页
  setPagination: (pagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...pagination }
    }));
  },
  
  // 设置筛选条件
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, current: 1 }
    }));
  },
  
  // 设置排序
  setSorter: (sorter) => {
    set({ sorter });
  },
  
  // 设置选中的兑换记录
  setSelectedExchange: (exchange) => {
    set({ selectedExchange: exchange });
  },
  
  // 清除选中的兑换记录
  clearSelectedExchange: () => {
    set({ selectedExchange: null });
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null });
  },
  
  // 重置筛选条件
  resetFilters: () => {
    set({
      filters: {
        keyword: '',
        status: undefined,
        dateRange: null,
        userId: undefined,
        productId: undefined
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      }
    });
  },
  
  // 重置所有状态
  reset: () => {
    set({
      exchanges: [],
      selectedExchange: null,
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      filters: {
        keyword: '',
        status: undefined,
        dateRange: null,
        userId: undefined,
        productId: undefined
      },
      sorter: {
        field: 'created_at',
        order: 'descend'
      },
      statistics: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0
      },
      loading: false,
      actionLoading: false,
      statsLoading: false,
      error: null
    });
  }
}));

// {{END_MODIFICATIONS}}