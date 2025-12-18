// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-17T01:44:20Z
//   Phase: D-Develop
//   Context-Analysis: "创建应用全局状态管理store"
//   Principle_Applied: "State-Management, UI-State, Theme"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 应用全局状态管理
 * 管理侧边栏状态、主题、全局加载状态等
 */
export const useAppStore = create(
  persist(
    (set, get) => ({
      // 侧边栏状态
      sidebarCollapsed: false,
      
      // 主题设置
      theme: 'light', // 'light' | 'dark'
      primaryColor: '#1890ff',
      
      // 全局加载状态
      globalLoading: false,
      loadingText: '',
      
      // 面包屑
      breadcrumbs: [],
      
      // 页面标题
      pageTitle: '',
      
      // 通知数量
      notificationCount: 0,
      
      // 切换侧边栏
      toggleSidebar: () => {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },
      
      // 设置侧边栏状态
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      
      // 设置主题
      setTheme: (theme) => {
        set({ theme });
        // 更新document的class以支持CSS变量
        document.documentElement.setAttribute('data-theme', theme);
      },
      
      // 设置主色调
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
      },
      
      // 设置全局加载状态
      setGlobalLoading: (loading, text = '') => {
        set({ globalLoading: loading, loadingText: text });
      },
      
      // 设置面包屑
      setBreadcrumbs: (breadcrumbs) => {
        set({ breadcrumbs });
      },
      
      // 设置页面标题
      setPageTitle: (title) => {
        set({ pageTitle: title });
        document.title = title ? `${title} - LiveHup管理系统` : 'LiveHup管理系统';
      },
      
      // 设置通知数量
      setNotificationCount: (count) => {
        set({ notificationCount: count });
      },
      
      // 增加通知数量
      incrementNotificationCount: () => {
        set({ notificationCount: get().notificationCount + 1 });
      },
      
      // 清除通知数量
      clearNotificationCount: () => {
        set({ notificationCount: 0 });
      },
      
      // 重置应用状态
      resetAppState: () => {
        set({
          sidebarCollapsed: false,
          globalLoading: false,
          loadingText: '',
          breadcrumbs: [],
          pageTitle: '',
          notificationCount: 0
        });
      }
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        primaryColor: state.primaryColor
      })
    }
  )
);

// {{END_MODIFICATIONS}}