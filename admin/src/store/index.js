// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-18T07:21:30Z
//   Phase: D-Develop
//   Context-Analysis: "更新全局状态管理入口，导出forceLogout"
//   Principle_Applied: "State-Management, DRY, Single-Source-of-Truth"
// }}
// {{START_MODIFICATIONS}}

/**
 * 全局状态管理入口
 * 导出所有store供组件使用
 */

export { useAuthStore, forceLogout } from './authStore';
export { useAppStore } from './appStore';
export { useDashboardStore } from './dashboardStore';
export { useUsersStore } from './usersStore';
export { useProductsStore } from './productsStore';
export { useExchangesStore } from './exchangesStore';

/**
 * 重置所有store状态
 * 用于用户登出时清理所有状态
 */
export const resetAllStores = () => {
  const { useAuthStore } = require('./authStore');
  const { useAppStore } = require('./appStore');
  const { useDashboardStore } = require('./dashboardStore');
  const { useUsersStore } = require('./usersStore');
  const { useProductsStore } = require('./productsStore');
  const { useExchangesStore } = require('./exchangesStore');
  
  useAuthStore.getState().reset();
  useAppStore.getState().resetAppState();
  useDashboardStore.getState().reset();
  useUsersStore.getState().reset();
  useProductsStore.getState().reset();
  useExchangesStore.getState().reset();
};

// {{END_MODIFICATIONS}}