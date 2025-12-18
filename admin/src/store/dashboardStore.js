// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-17T01:45:04Z
//   Phase: D-Develop
//   Context-Analysis: "创建仪表盘数据状态管理store"
//   Principle_Applied: "State-Management, Data-Caching, API-Integration"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { dashboardAPI } from '../services/api';

/**
 * 仪表盘状态管理
 * 管理仪表盘统计数据、图表数据等
 */
export const useDashboardStore = create((set, get) => ({
  // 统计数据
  stats: {
    totalUsers: 0,
    totalPoints: 0,
    totalExchanges: 0,
    totalProducts: 0,
    todayNewUsers: 0,
    todayExchanges: 0,
    todayPointsIssued: 0,
    todayPointsUsed: 0
  },
  
  // 图表数据
  chartData: {
    pointsTrend: [],      // 积分趋势
    exchangesTrend: [],   // 兑换趋势
    usersTrend: [],       // 用户增长趋势
    topProducts: [],      // 热门商品
    topUsers: []          // 活跃用户
  },
  
  // 最近活动
  recentActivities: [],
  
  // 加载状态
  loading: {
    stats: false,
    chartData: false,
    activities: false
  },
  
  // 错误状态
  error: null,
  
  // 数据刷新时间
  lastUpdated: null,
  
  // 获取统计数据
  fetchStats: async (signal) => {
    set((state) => ({
      loading: { ...state.loading, stats: true }
    }));
    
    try {
      const response = await dashboardAPI.getStats({ signal });
      set({
        stats: response.data,
        error: null,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ error: error.response?.data?.message || '获取统计数据失败' });
      }
    } finally {
      set((state) => ({
        loading: { ...state.loading, stats: false }
      }));
    }
  },
  
  // 获取图表数据
  fetchChartData: async (params = {}, signal) => {
    set((state) => ({
      loading: { ...state.loading, chartData: true }
    }));
    
    try {
      const response = await dashboardAPI.getChartData(params, { signal });
      set((state) => ({
        chartData: { ...state.chartData, ...response.data },
        error: null
      }));
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ error: error.response?.data?.message || '获取图表数据失败' });
      }
    } finally {
      set((state) => ({
        loading: { ...state.loading, chartData: false }
      }));
    }
  },
  
  // 获取最近活动
  fetchRecentActivities: async (signal) => {
    set((state) => ({
      loading: { ...state.loading, activities: true }
    }));
    
    try {
      const response = await dashboardAPI.getRecentActivities({ signal });
      set({
        recentActivities: response.data,
        error: null
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ error: error.response?.data?.message || '获取最近活动失败' });
      }
    } finally {
      set((state) => ({
        loading: { ...state.loading, activities: false }
      }));
    }
  },
  
  // 刷新所有数据
  refreshAll: async (signal) => {
    const { fetchStats, fetchChartData, fetchRecentActivities } = get();
    await Promise.all([
      fetchStats(signal),
      fetchChartData({}, signal),
      fetchRecentActivities(signal)
    ]);
  },
  
  // 检查是否正在加载
  isLoading: () => {
    const { loading } = get();
    return loading.stats || loading.chartData || loading.activities;
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null });
  },
  
  // 重置状态
  reset: () => {
    set({
      stats: {
        totalUsers: 0,
        totalPoints: 0,
        totalExchanges: 0,
        totalProducts: 0,
        todayNewUsers: 0,
        todayExchanges: 0,
        todayPointsIssued: 0,
        todayPointsUsed: 0
      },
      chartData: {
        pointsTrend: [],
        exchangesTrend: [],
        usersTrend: [],
        topProducts: [],
        topUsers: []
      },
      recentActivities: [],
      loading: {
        stats: false,
        chartData: false,
        activities: false
      },
      error: null,
      lastUpdated: null
    });
  }
}));

// {{END_MODIFICATIONS}}