// {{CODE-Cycle-Integration:
//   Task_ID: [#T010]
//   Timestamp: 2025-12-17T01:47:51Z
//   Phase: D-Develop
//   Context-Analysis: "创建请求取消机制hooks"
//   Principle_Applied: "AbortController, Memory-Leak-Prevention, React-Hooks"
// }}
// {{START_MODIFICATIONS}}

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * 创建AbortController的hook
 * 组件卸载时自动取消所有pending请求
 */
export const useAbortController = () => {
  const abortControllerRef = useRef(null);

  // 获取新的AbortController
  const getAbortController = useCallback(() => {
    // 如果存在旧的controller，先取消它
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 创建新的controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  // 获取当前的signal
  const getSignal = useCallback(() => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current.signal;
  }, []);

  // 取消当前请求
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    getAbortController,
    getSignal,
    abort
  };
};

/**
 * 管理多个请求的AbortController
 * 适用于页面有多个独立请求的场景
 */
export const useMultipleAbortControllers = () => {
  const controllersRef = useRef(new Map());

  // 获取指定key的AbortController
  const getController = useCallback((key) => {
    // 如果存在旧的controller，先取消它
    if (controllersRef.current.has(key)) {
      controllersRef.current.get(key).abort();
    }
    // 创建新的controller
    const controller = new AbortController();
    controllersRef.current.set(key, controller);
    return controller;
  }, []);

  // 获取指定key的signal
  const getSignal = useCallback((key) => {
    return getController(key).signal;
  }, [getController]);

  // 取消指定key的请求
  const abort = useCallback((key) => {
    if (controllersRef.current.has(key)) {
      controllersRef.current.get(key).abort();
      controllersRef.current.delete(key);
    }
  }, []);

  // 取消所有请求
  const abortAll = useCallback(() => {
    controllersRef.current.forEach((controller) => {
      controller.abort();
    });
    controllersRef.current.clear();
  }, []);

  // 组件卸载时取消所有请求
  useEffect(() => {
    return () => {
      abortAll();
    };
  }, [abortAll]);

  return {
    getController,
    getSignal,
    abort,
    abortAll
  };
};

/**
 * 通用的异步请求hook
 * 自动处理loading状态、错误处理和请求取消
 */
export const useAsyncRequest = (requestFn, options = {}) => {
  const {
    manual = false,        // 是否手动触发
    defaultParams = [],    // 默认参数
    onSuccess,             // 成功回调
    onError,               // 错误回调
    initialData = null     // 初始数据
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState(null);
  
  const { getSignal, abort } = useAbortController();
  const mountedRef = useRef(true);

  // 执行请求
  const run = useCallback(async (...params) => {
    setLoading(true);
    setError(null);
    
    try {
      const signal = getSignal();
      const result = await requestFn(...params, { signal });
      
      // 检查组件是否还挂载
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      // 忽略取消的请求
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        onError?.(err);
      }
      
      throw err;
    }
  }, [requestFn, getSignal, onSuccess, onError]);

  // 重置状态
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  // 刷新（使用上次的参数）
  const paramsRef = useRef(defaultParams);
  const refresh = useCallback(() => {
    return run(...paramsRef.current);
  }, [run]);

  // 带参数的run，同时保存参数
  const runWithParams = useCallback((...params) => {
    paramsRef.current = params;
    return run(...params);
  }, [run]);

  // 自动执行
  useEffect(() => {
    if (!manual) {
      run(...defaultParams);
    }
  }, [manual]); // eslint-disable-line react-hooks/exhaustive-deps

  // 组件卸载标记
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    run: runWithParams,
    refresh,
    reset,
    abort
  };
};

/**
 * 分页请求hook
 * 自动处理分页逻辑和请求取消
 */
export const usePaginatedRequest = (requestFn, options = {}) => {
  const {
    defaultPageSize = 10,
    defaultParams = {},
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: defaultPageSize,
    total: 0
  });
  
  const { getSignal, abort } = useAbortController();
  const mountedRef = useRef(true);
  const paramsRef = useRef(defaultParams);

  // 执行请求
  const run = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    const mergedParams = {
      ...paramsRef.current,
      ...params,
      page: params.page || pagination.current,
      pageSize: params.pageSize || pagination.pageSize
    };
    
    try {
      const signal = getSignal();
      const result = await requestFn(mergedParams, { signal });
      
      if (mountedRef.current) {
        setData(result.list || result.data || result);
        setPagination(prev => ({
          ...prev,
          current: mergedParams.page,
          pageSize: mergedParams.pageSize,
          total: result.total || 0
        }));
        setLoading(false);
        onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        onError?.(err);
      }
      
      throw err;
    }
  }, [requestFn, getSignal, pagination.current, pagination.pageSize, onSuccess, onError]);

  // 切换页码
  const changePage = useCallback((page, pageSize) => {
    return run({ page, pageSize: pageSize || pagination.pageSize });
  }, [run, pagination.pageSize]);

  // 刷新当前页
  const refresh = useCallback(() => {
    return run({ page: pagination.current, pageSize: pagination.pageSize });
  }, [run, pagination.current, pagination.pageSize]);

  // 重置到第一页
  const reset = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
    return run({ page: 1 });
  }, [run]);

  // 更新筛选参数
  const setParams = useCallback((params) => {
    paramsRef.current = { ...paramsRef.current, ...params };
    return run({ page: 1, ...params });
  }, [run]);

  // 初始加载
  useEffect(() => {
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 组件卸载标记
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    pagination,
    run,
    changePage,
    refresh,
    reset,
    setParams,
    abort
  };
};

/**
 * 防抖请求hook
 * 适用于搜索等需要防抖的场景
 */
export const useDebouncedRequest = (requestFn, delay = 300, options = {}) => {
  const timerRef = useRef(null);
  const { getSignal, abort } = useAbortController();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(options.initialData || null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const run = useCallback((...params) => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // 取消之前的请求
    abort();
    
    return new Promise((resolve, reject) => {
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);
        
        try {
          const signal = getSignal();
          const result = await requestFn(...params, { signal });
          
          if (mountedRef.current) {
            setData(result);
            setLoading(false);
            options.onSuccess?.(result);
          }
          
          resolve(result);
        } catch (err) {
          if (err.name === 'CanceledError' || err.name === 'AbortError') {
            return;
          }
          
          if (mountedRef.current) {
            setError(err);
            setLoading(false);
            options.onError?.(err);
          }
          
          reject(err);
        }
      }, delay);
    });
  }, [requestFn, delay, getSignal, abort, options]);

  // 立即执行（不防抖）
  const runImmediately = useCallback(async (...params) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    abort();
    
    setLoading(true);
    setError(null);
    
    try {
      const signal = getSignal();
      const result = await requestFn(...params, { signal });
      
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
      
      return result;
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
        }
        throw err;
      }
    }
  }, [requestFn, getSignal, abort]);

  // 取消
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    abort();
  }, [abort]);

  // 清理
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return {
    data,
    loading,
    error,
    run,
    runImmediately,
    cancel
  };
};

// {{END_MODIFICATIONS}}