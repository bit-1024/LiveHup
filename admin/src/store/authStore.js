// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-18T07:20:00Z
//   Phase: D-Develop
//   Context-Analysis: "修复认证状态管理，解决登录循环问题"
//   Principle_Applied: "State-Management, Security, Token-Validation"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '../services/api';
import { message } from 'antd';

/**
 * 认证状态管理
 * 管理用户登录状态、用户信息、token等
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 状态
      isAuthenticated: false,
      user: null,
      token: null,
      loading: true, // 初始为true，等待checkAuth完成
      error: null,
      authChecked: false, // 标记是否已完成认证检查

      // 登录
      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { token, user } = response.data;
          
          // 保存token到localStorage（用于API请求）
          localStorage.setItem('token', token);
          
          set({
            isAuthenticated: true,
            user,
            token,
            loading: false,
            error: null,
            authChecked: true
          });
          
          message.success('登录成功');
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || '登录失败';
          set({
            loading: false,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      },

      // 登出
      logout: async () => {
        const currentToken = get().token || localStorage.getItem('token');
        try {
          if (currentToken) {
            await authAPI.logout();
          }
        } catch (error) {
          // 忽略登出API错误
          console.error('登出API调用失败:', error);
        } finally {
          // 清除本地状态
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('auth-storage');
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            error: null,
            authChecked: true
          });
          
          message.success('退出登录成功');
        }
      },

      // 更新用户信息
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },

      // 检查认证状态（异步验证token有效性）
      checkAuth: async () => {
        // 如果已经检查过，直接返回
        if (get().authChecked) {
          set({ loading: false });
          return get().isAuthenticated;
        }

        const token = localStorage.getItem('token');
        
        // 没有token，直接设置为未认证
        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            authChecked: true
          });
          return false;
        }

        // 有token，验证其有效性
        try {
          const response = await authAPI.getCurrentUser();
          const user = response.data;
          
          set({
            isAuthenticated: true,
            user,
            token,
            loading: false,
            authChecked: true
          });
          return true;
        } catch (error) {
          // token无效，清除状态
          console.error('Token验证失败:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('auth-storage');
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            authChecked: true
          });
          return false;
        }
      },

      // 强制登出（用于401响应）
      forceLogout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('auth-storage');
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          error: null,
          authChecked: true,
          loading: false
        });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 重置状态
      reset: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('auth-storage');
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          authChecked: false
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化token，不持久化isAuthenticated
        // 这样每次刷新都会重新验证token
        token: state.token,
        user: state.user
      }),
      // 恢复状态时的处理
      onRehydrateStorage: () => (state) => {
        // 恢复后，需要重新验证token
        if (state) {
          state.authChecked = false;
          state.loading = true;
          state.isAuthenticated = false;
        }
      }
    }
  )
);

// 导出forceLogout供api.js使用
export const forceLogout = () => {
  useAuthStore.getState().forceLogout();
};

// {{END_MODIFICATIONS}}