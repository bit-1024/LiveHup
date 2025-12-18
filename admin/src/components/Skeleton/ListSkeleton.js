// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:57:19Z
//   Phase: D-Develop
//   Context-Analysis: "创建列表骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, List, Skeleton, Space } from 'antd';

/**
 * 列表骨架屏组件
 * 用于列表页面加载时显示
 */
const ListSkeleton = ({ 
  count = 5,           // 列表项数量
  hasAvatar = true,    // 是否显示头像
  hasImage = false,    // 是否显示图片
  hasActions = true,   // 是否显示操作按钮
  hasTitle = true      // 是否显示标题
}) => {
  return (
    <Card title={hasTitle && <Skeleton.Input active style={{ width: 120 }} />}>
      <List
        itemLayout="horizontal"
        dataSource={[...Array(count)]}
        renderItem={(_, index) => (
          <List.Item
            key={index}
            actions={
              hasActions
                ? [
                    <Skeleton.Button key="1" active size="small" style={{ width: 50 }} />,
                    <Skeleton.Button key="2" active size="small" style={{ width: 50 }} />,
                  ]
                : undefined
            }
          >
            <Skeleton
              avatar={hasAvatar ? { size: 48 } : false}
              title={{ width: '40%' }}
              paragraph={{ rows: 2, width: ['80%', '60%'] }}
              active
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

/**
 * 活动列表骨架屏
 * 用于活动/动态列表加载时显示
 */
export const ActivityListSkeleton = ({ count = 5 }) => {
  return (
    <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
      {[...Array(count)].map((_, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            padding: '16px 0',
            borderBottom: index < count - 1 ? '1px solid #f0f0f0' : 'none'
          }}
        >
          <Skeleton.Avatar active size={40} style={{ marginRight: 12 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Skeleton.Input active style={{ width: 100 }} size="small" />
              <Skeleton.Input active style={{ width: 80 }} size="small" />
            </div>
            <Skeleton.Input active style={{ width: '90%' }} size="small" />
          </div>
        </div>
      ))}
    </Card>
  );
};

/**
 * 通知列表骨架屏
 */
export const NotificationListSkeleton = ({ count = 5 }) => {
  return (
    <div>
      {[...Array(count)].map((_, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            background: index % 2 === 0 ? '#fafafa' : '#fff'
          }}
        >
          <div style={{ marginRight: 12 }}>
            <Skeleton.Avatar active size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <Skeleton.Input active style={{ width: '70%', marginBottom: 4 }} size="small" />
            <Skeleton.Input active style={{ width: '40%' }} size="small" />
          </div>
          <div>
            <Skeleton.Input active style={{ width: 60 }} size="small" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 排行榜骨架屏
 */
export const RankingListSkeleton = ({ count = 10 }) => {
  return (
    <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
      {[...Array(count)].map((_, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: index < count - 1 ? '1px solid #f0f0f0' : 'none'
          }}
        >
          <div style={{ 
            width: 24, 
            height: 24, 
            marginRight: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Skeleton.Avatar active size={24} shape="square" />
          </div>
          <Skeleton.Avatar active size={36} style={{ marginRight: 12 }} />
          <div style={{ flex: 1 }}>
            <Skeleton.Input active style={{ width: 100 }} size="small" />
          </div>
          <Skeleton.Input active style={{ width: 60 }} size="small" />
        </div>
      ))}
    </Card>
  );
};

/**
 * 时间线骨架屏
 */
export const TimelineSkeleton = ({ count = 5 }) => {
  return (
    <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
      <div style={{ paddingLeft: 20 }}>
        {[...Array(count)].map((_, index) => (
          <div 
            key={index} 
            style={{ 
              position: 'relative',
              paddingBottom: index < count - 1 ? 24 : 0,
              paddingLeft: 24
            }}
          >
            {/* 时间线点 */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#f0f0f0'
            }} />
            {/* 时间线 */}
            {index < count - 1 && (
              <div style={{
                position: 'absolute',
                left: 4,
                top: 14,
                width: 2,
                height: 'calc(100% - 10px)',
                background: '#f0f0f0'
              }} />
            )}
            {/* 内容 */}
            <div>
              <Skeleton.Input active style={{ width: 120, marginBottom: 8 }} size="small" />
              <Skeleton.Input active style={{ width: '80%' }} size="small" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * 评论列表骨架屏
 */
export const CommentListSkeleton = ({ count = 3 }) => {
  return (
    <div>
      {[...Array(count)].map((_, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex',
            padding: '16px 0',
            borderBottom: index < count - 1 ? '1px solid #f0f0f0' : 'none'
          }}
        >
          <Skeleton.Avatar active size={40} style={{ marginRight: 12 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <Skeleton.Input active style={{ width: 80, marginRight: 12 }} size="small" />
              <Skeleton.Input active style={{ width: 100 }} size="small" />
            </div>
            <Skeleton paragraph={{ rows: 2, width: ['100%', '80%'] }} active title={false} />
            <Space style={{ marginTop: 8 }}>
              <Skeleton.Button active size="small" style={{ width: 50 }} />
              <Skeleton.Button active size="small" style={{ width: 50 }} />
            </Space>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;

// {{END_MODIFICATIONS}}