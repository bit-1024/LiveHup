import React from 'react';
import { Empty, Button, Skeleton, Card } from 'react-vant';
import Icon from './Icon';

/**
 * 通用加载状态组件
 * @param {string} type - 加载类型: 'spinner' | 'skeleton' | 'card'
 * @param {string} text - 加载提示文字
 * @param {number} rows - 骨架屏行数 (仅 skeleton 类型)
 * @param {number} count - 卡片数量 (仅 card 类型)
 */
export const LoadingState = ({ 
  type = 'spinner', 
  text = '加载中...', 
  rows = 3,
  count = 3,
  style = {}
}) => {
  if (type === 'skeleton') {
    return (
      <div style={{ padding: '16px', ...style }}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} style={{ marginBottom: 12, borderRadius: '12px' }}>
            <div style={{ padding: '16px' }}>
              <Skeleton title row={rows} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
        padding: '16px',
        ...style
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <Skeleton style={{ height: '150px', width: '100%' }} />
            <div style={{ padding: '12px' }}>
              <Skeleton title row={2} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // 默认 spinner 类型
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px 24px',
      color: 'var(--text-color-secondary)',
      ...style
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--primary-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16
      }} />
      <div style={{ fontSize: 14 }}>{text}</div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * 通用错误状态组件
 * @param {string} title - 错误标题
 * @param {string} message - 错误描述
 * @param {function} onRetry - 重试回调函数
 * @param {string} retryText - 重试按钮文字
 * @param {string} icon - 图标名称
 */
export const ErrorState = ({ 
  title = '出错了',
  message = '加载失败，请稍后重试',
  onRetry,
  retryText = '重新加载',
  icon = 'warning-o',
  style = {}
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px 24px',
      textAlign: 'center',
      ...style
    }}>
      <div style={{
        width: 64,
        height: 64,
        background: 'rgba(220, 53, 69, 0.1)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}>
        <Icon name={icon} size={32} color="var(--danger-color)" />
      </div>
      <div style={{ 
        fontSize: 17, 
        fontWeight: 600, 
        color: 'var(--text-color)',
        marginBottom: 8
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: 14, 
        color: 'var(--text-color-secondary)',
        marginBottom: 24,
        maxWidth: 280,
        lineHeight: 1.5
      }}>
        {message}
      </div>
      {onRetry && (
        <Button 
          type="primary" 
          round 
          onClick={onRetry}
          style={{ minWidth: 120 }}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};

/**
 * 通用空状态组件
 * @param {string} title - 空状态标题
 * @param {string} description - 空状态描述
 * @param {string} icon - 图标名称
 * @param {React.ReactNode} action - 操作按钮
 */
export const EmptyState = ({ 
  title,
  description = '暂无数据',
  icon = 'info-o',
  action,
  style = {}
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px 24px',
      textAlign: 'center',
      ...style
    }}>
      <div style={{
        width: 64,
        height: 64,
        background: 'var(--background-color)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}>
        <Icon name={icon} size={32} color="var(--text-color-placeholder)" />
      </div>
      {title && (
        <div style={{ 
          fontSize: 17, 
          fontWeight: 600, 
          color: 'var(--text-color)',
          marginBottom: 8
        }}>
          {title}
        </div>
      )}
      <div style={{ 
        fontSize: 14, 
        color: 'var(--text-color-secondary)',
        marginBottom: action ? 24 : 0,
        maxWidth: 280,
        lineHeight: 1.5
      }}>
        {description}
      </div>
      {action}
    </div>
  );
};

/**
 * 通用网络错误状态组件
 */
export const NetworkErrorState = ({ onRetry, style = {} }) => (
  <ErrorState
    title="网络连接失败"
    message="请检查您的网络连接后重试"
    icon="wifi-o"
    onRetry={onRetry}
    retryText="重新连接"
    style={style}
  />
);

/**
 * 通用服务器错误状态组件
 */
export const ServerErrorState = ({ onRetry, style = {} }) => (
  <ErrorState
    title="服务器错误"
    message="服务器暂时无法响应，请稍后再试"
    icon="service-o"
    onRetry={onRetry}
    retryText="重新加载"
    style={style}
  />
);

/**
 * 通用未授权状态组件
 */
export const UnauthorizedState = ({ onLogin, style = {} }) => (
  <ErrorState
    title="请先登录"
    message="您需要登录后才能查看此内容"
    icon="user-o"
    onRetry={onLogin}
    retryText="去登录"
    style={style}
  />
);

/**
 * 页面级加载状态包装组件
 * @param {boolean} loading - 是否加载中
 * @param {boolean} error - 是否有错误
 * @param {string} errorMessage - 错误信息
 * @param {function} onRetry - 重试回调
 * @param {React.ReactNode} children - 子组件
 * @param {string} loadingType - 加载类型
 */
export const PageStateWrapper = ({
  loading,
  error,
  errorMessage,
  onRetry,
  children,
  loadingType = 'skeleton',
  loadingRows = 3,
  loadingCount = 3
}) => {
  if (loading) {
    return (
      <LoadingState 
        type={loadingType} 
        rows={loadingRows}
        count={loadingCount}
      />
    );
  }

  if (error) {
    return (
      <ErrorState 
        message={errorMessage || '加载失败，请稍后重试'}
        onRetry={onRetry}
      />
    );
  }

  return children;
};

export default {
  LoadingState,
  ErrorState,
  EmptyState,
  NetworkErrorState,
  ServerErrorState,
  UnauthorizedState,
  PageStateWrapper
};