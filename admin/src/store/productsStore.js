// {{CODE-Cycle-Integration:
//   Task_ID: [#T009]
//   Timestamp: 2025-12-17T01:46:04Z
//   Phase: D-Develop
//   Context-Analysis: "创建商品管理状态store"
//   Principle_Applied: "State-Management, CRUD-Operations, Image-Upload"
// }}
// {{START_MODIFICATIONS}}

import { create } from 'zustand';
import { productsAPI } from '../services/api';
import { message } from 'antd';

/**
 * 商品管理状态
 * 管理商品列表、分页、筛选、CRUD操作
 */
export const useProductsStore = create((set, get) => ({
  // 商品列表
  products: [],
  
  // 当前选中的商品
  selectedProduct: null,
  
  // 商品分类
  categories: [],
  
  // 分页信息
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  },
  
  // 筛选条件
  filters: {
    keyword: '',
    category: undefined,
    status: undefined,
    priceRange: null
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
  
  // 上传加载状态
  uploadLoading: false,
  
  // 错误信息
  error: null,
  
  // 获取商品列表
  fetchProducts: async (params = {}, signal) => {
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
      const response = await productsAPI.getList(requestParams, { signal });
      set({
        products: response.data.list || response.data,
        pagination: {
          ...pagination,
          total: response.data.total || response.data.length
        },
        loading: false
      });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({
          error: error.response?.data?.message || '获取商品列表失败',
          loading: false
        });
      }
    }
  },
  
  // 获取商品分类
  fetchCategories: async (signal) => {
    try {
      const response = await productsAPI.getCategories({ signal });
      set({ categories: response.data });
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('获取商品分类失败:', error);
      }
    }
  },
  
  // 获取单个商品详情
  fetchProductDetail: async (id, signal) => {
    set({ actionLoading: true });
    
    try {
      const response = await productsAPI.getDetail(id, { signal });
      set({
        selectedProduct: response.data,
        actionLoading: false
      });
      return response.data;
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        set({ actionLoading: false });
        message.error(error.response?.data?.message || '获取商品详情失败');
      }
      return null;
    }
  },
  
  // 创建商品
  createProduct: async (productData) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.create(productData);
      message.success('创建商品成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchProducts();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '创建商品失败');
      return false;
    }
  },
  
  // 更新商品
  updateProduct: async (id, productData) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.update(id, productData);
      message.success('更新商品成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchProducts();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '更新商品失败');
      return false;
    }
  },
  
  // 删除商品
  deleteProduct: async (id) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.delete(id);
      message.success('删除商品成功');
      set({ actionLoading: false });
      // 刷新列表
      get().fetchProducts();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '删除商品失败');
      return false;
    }
  },
  
  // 批量删除商品
  batchDeleteProducts: async (ids) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.batchDelete(ids);
      message.success(`成功删除 ${ids.length} 个商品`);
      set({ actionLoading: false });
      // 刷新列表
      get().fetchProducts();
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '批量删除失败');
      return false;
    }
  },
  
  // 更新商品状态（上架/下架）
  updateProductStatus: async (id, status) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.updateStatus(id, status);
      message.success(status === 'active' ? '商品已上架' : '商品已下架');
      set({ actionLoading: false });
      // 更新本地列表中的状态
      set((state) => ({
        products: state.products.map(product =>
          product.id === id ? { ...product, status } : product
        )
      }));
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '状态更新失败');
      return false;
    }
  },
  
  // 更新商品库存
  updateProductStock: async (id, stock) => {
    set({ actionLoading: true });
    
    try {
      await productsAPI.updateStock(id, stock);
      message.success('库存更新成功');
      set({ actionLoading: false });
      // 更新本地列表中的库存
      set((state) => ({
        products: state.products.map(product =>
          product.id === id ? { ...product, stock } : product
        )
      }));
      return true;
    } catch (error) {
      set({ actionLoading: false });
      message.error(error.response?.data?.message || '库存更新失败');
      return false;
    }
  },
  
  // 上传商品图片
  uploadProductImage: async (file) => {
    set({ uploadLoading: true });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await productsAPI.uploadImage(formData);
      set({ uploadLoading: false });
      return response.data.url;
    } catch (error) {
      set({ uploadLoading: false });
      message.error(error.response?.data?.message || '图片上传失败');
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
      pagination: { ...state.pagination, current: 1 }
    }));
  },
  
  // 设置排序
  setSorter: (sorter) => {
    set({ sorter });
  },
  
  // 设置选中的商品
  setSelectedProduct: (product) => {
    set({ selectedProduct: product });
  },
  
  // 清除选中的商品
  clearSelectedProduct: () => {
    set({ selectedProduct: null });
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
        category: undefined,
        status: undefined,
        priceRange: null
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
      products: [],
      selectedProduct: null,
      categories: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      filters: {
        keyword: '',
        category: undefined,
        status: undefined,
        priceRange: null
      },
      sorter: {
        field: 'created_at',
        order: 'descend'
      },
      loading: false,
      actionLoading: false,
      uploadLoading: false,
      error: null
    });
  }
}));

// {{END_MODIFICATIONS}}