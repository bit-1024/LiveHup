// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-17T01:45:32Z
//   Phase: D-Develop
//   Context-Analysis: "创建用户管理状态store"
//   Principle_Applied: "State-Management, CRUD-Operations, Pagination"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { usersAPI } from '../services/api';
import { message } from 'antd';

/**
 * 用户管理状态
 * 管理用户列表、分页、筛选、CRUD操作
 */
export const useUsersStore = create((set, get) => ({
  // 用户列表
  users: [],
  
  // 当前选中的用户
  selectedUser: null,
  
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
    dateRange: null
  },
  
  // 排序
  sorter: {
    field: 'created_at',
    order: 'descend'
  },
  
  // 加载状态
  loading: false,
  
  // 操作加载状态
  actionLoading: false,
  
  // 错误信息
  error: null,
  
  // 获取用户列表
  fetchUsers: async (params = {}, signal) => {
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
      const response = await usersAPI.getList(requestParams, { signal });
      set({
        users: response.data.list || response.data,
        pagination: {
          ...pagination,
          total: response.data.total || response.data.length
        },
        loading: false
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({
          error: error.response?.data?.message || '获取用户列表失败',
          loading: false
        });
      }
    }
  },
  
  // 获取单个用户详情
  fetchUserDetail: async (id, signal) => {
    set({ actionLoading: true });
    
    try {
      const response = await usersAPI.getDetail(id, { signal });
      set({
        selectedUser: response.data,
        actionLoading: false
      });
      return response.data;
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ actionLoading: false });
        message.error(error.response?.data?.message || '获取用户详情失败');
      }
      return null;
    }
  },
  
  // 创建用户
  createUser: async (userData) => {
    set({ actionLoading: true });
    
    try {
      await usersAPI.create(userData);
      message.success('创建用户成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchUsers();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '创建用户失败');
      return false;
    }
  },
  
  // 更新用户
  updateUser: async (id, userData) => {
    set({ actionLoading: true });
    
    try {
      await usersAPI.update(id, userData);
      message.success('更新用户成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchUsers();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '更新用户失败');
      return false;
    }
  },
  
  // 删除用户
  deleteUser: async (id) => {
    set({ actionLoading: true });
    
    try {
      await usersAPI.delete(id);
      message.success('删除用户成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchUsers();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '删除用户失败');
      return false;
    }
  },
  
  // 批量删除用户
  batchDeleteUsers: async (ids) => {
    set({ actionLoading: true });
    
    try {
      await usersAPI.batchDelete(ids);
      message.success(`成功删除 ${ids.length} 个用户`);
      set({ actionLoading: false });
      // 刷新列表
      get().fetchUsers();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '批量删除失败');
      return false;
    }
  },
  
  // 更新用户状态
  updateUserStatus: async (id, status) => {
    set({ actionLoading: true });
    
    try {
      await usersAPI.updateStatus(id, status);
      message.success('状态更新成功');
      set({ actionLoading: false });
      // 更新本地列表中的状态
      set((state) => ({
        users: state.users.map(user =>
          user.id === id ? { ...user, status } : user
        )
      }));
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '状态更新失败');
      return false;
    }
  },
  
  // 重置用户密码
  resetUserPassword: async (id) => {
    set({ actionLoading: true });
    
    try {
      const response = await usersAPI.resetPassword(id);
      message.success('密码重置成功');
      set({ actionLoading: false });
      return response.data;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '密码重置失败');
      return null;
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
      pagination: { ...state.pagination, current: 1 } // 重置到第一页
    }));
  },
  
  // 设置排序
  setSorter: (sorter) => {
    set({ sorter });
  },
  
  // 设置选中的用户
  setSelectedUser: (user) => {
    set({ selectedUser: user });
  },
  
  // 清除选中的用户
  clearSelectedUser: () => {
    set({ selectedUser: null });
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
        dateRange: null
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
      users: [],
      selectedUser: null,
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      filters: {
        keyword: '',
        status: undefined,
        dateRange: null
      },
      sorter: {
        field: 'created_at',
        order: 'descend'
      },
      loading: false,
      actionLoading: false,
      error: null
    });
  }
}));

// {{END_MODIFICATIONS}}