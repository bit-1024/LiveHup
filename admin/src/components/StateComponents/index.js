import React from 'react';
import { Result, Button, Spin, Empty, Card, Skeleton, Row, Col } from 'antd';
import { 
  LoadingOutlined, 
  ReloadOutlined,
  WifiOutlined,
  CloudServerOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';

/**
 * 通用加载状态组件
 * @param {string} type - 加载类型: 'spinner' | 'skeleton' | 'card' | 'table'
 * @param {string} tip - 加载提示文字
 * @param {number} rows - 骨架屏行数
 * @param {number} count - 卡片/行数量
 */
export const LoadingState = ({ 
  type = 'spinner', 
  tip = '加载中...', 
  rows = 3,
  count = 3,
  style = {}
}) => {
  if (type === 'skeleton') {
    return (
      <div style={{ padding: '24px', ...style }}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} style={{ marginBottom: 16 }} className="content-card">
            <Skeleton active paragraph={{ rows }} />
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <Row gutter={[16, 16]} style={{ padding: '24px', ...style }}>
        {Array.from({ length: count }).map((_, i) => (
          <Col key={i} xs={24} sm={12} md={8} lg={6}>
            <Card className="content-card">
              <Skeleton.Image active style={{ width: '100%', height: 150 }} />
              <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (type === 'table') {
    return (
      <div style={{ padding: '24px', ...style }}>
        <Card className="content-card">
          <Skeleton active paragraph={{ rows: count }} />
        </Card>
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
      minHeight: 200,
      ...style
    }}>
      <Spin 
        indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} 
        tip={tip}
        size="large"
      />
    </div>
  );
};

/**
 * 通用错误状态组件
 * @param {string} title - 错误标题
 * @param {string} subTitle - 错误描述
 * @param {function} onRetry - 重试回调函数
 * @param {string} retryText - 重试按钮文字
 * @param {string} status - 状态类型: 'error' | 'warning' | '403' | '404' | '500'
 */
export const ErrorState = ({ 
  title = '出错了',
  subTitle = '加载失败，请稍后重试',
  onRetry,
  retryText = '重新加载',
  status = 'error',
  icon,
  style = {}
}) => {
  return (
    <div style={{ padding: '24px', ...style }}>
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        icon={icon}
        extra={onRetry && (
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={onRetry}
          >
            {retryText}
          </Button>
        )}
      />
    </div>
  );
};

/**
 * 通用空状态组件
 * @param {string} description - 空状态描述
 * @param {React.ReactNode} image - 自定义图片
 * @param {React.ReactNode} children - 操作按钮等
 */
export const EmptyState = ({ 
  description = '暂无数据',
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  children,
  style = {}
}) => {
  return (
    <div style={{ padding: '48px 24px', ...style }}>
      <Empty
        image={image}
        description={description}
      >
        {children}
      </Empty>
    </div>
  );
};

/**
 * 通用网络错误状态组件
 */
export const NetworkErrorState = ({ onRetry, style = {} }) => (
  <ErrorState
    title="网络连接失败"
    subTitle="请检查您的网络连接后重试"
    icon={<WifiOutlined style={{ color: 'var(--error-color)', fontSize: 72 }} />}
    onRetry={onRetry}
    retryText="重新连接"
    status="error"
    style={style}
  />
);

/**
 * 通用服务器错误状态组件
 */
export const ServerErrorState = ({ onRetry, style = {} }) => (
  <ErrorState
    title="服务器错误"
    subTitle="服务器暂时无法响应，请稍后再试"
    icon={<CloudServerOutlined style={{ color: 'var(--error-color)', fontSize: 72 }} />}
    onRetry={onRetry}
    retryText="重新加载"
    status="500"
    style={style}
  />
);

/**
 * 通用未授权状态组件
 */
export const UnauthorizedState = ({ onLogin, style = {} }) => (
  <ErrorState
    title="请先登录"
    subTitle="您需要登录后才能访问此页面"
    icon={<LockOutlined style={{ color: 'var(--warning-color)', fontSize: 72 }} />}
    onRetry={onLogin}
    retryText="去登录"
    status="403"
    style={style}
  />
);

/**
 * 通用无权限状态组件
 */
export const ForbiddenState = ({ style = {} }) => (
  <ErrorState
    title="无访问权限"
    subTitle="抱歉，您没有权限访问此页面"
    status="403"
    style={style}
  />
);

/**
 * 通用页面未找到状态组件
 */
export const NotFoundState = ({ onBack, style = {} }) => (
  <ErrorState
    title="页面未找到"
    subTitle="抱歉，您访问的页面不存在"
    onRetry={onBack}
    retryText="返回首页"
    status="404"
    style={style}
  />
);

/**
 * 页面级加载状态包装组件
 * @param {boolean} loading - 是否加载中
 * @param {boolean} error - 是否有错误
 * @param {string} errorMessage - 错误信息
 * @param {function} onRetry - 重试回调
 * @param {boolean} empty - 是否为空
 * @param {string} emptyText - 空状态文字
 * @param {React.ReactNode} children - 子组件
 * @param {string} loadingType - 加载类型
 */
export const PageStateWrapper = ({
  loading,
  error,
  errorMessage,
  onRetry,
  empty,
  emptyText = '暂无数据',
  emptyAction,
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
        subTitle={errorMessage || '加载失败，请稍后重试'}
        onRetry={onRetry}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState description={emptyText}>
        {emptyAction}
      </EmptyState>
    );
  }

  return children;
};

/**
 * 内联加载状态组件（用于按钮等小区域）
 */
export const InlineLoading = ({ loading, children }) => {
  if (loading) {
    return <Spin size="small" />;
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
  ForbiddenState,
  NotFoundState,
  PageStateWrapper,
  InlineLoading
};