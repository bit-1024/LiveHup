// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:50:04Z
//   Phase: D-Develop
//   Context-Analysis: "创建表格骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, Skeleton, Space } from 'antd';

/**
 * 表格骨架屏组件
 * 用于表格页面加载时显示
 */
const TableSkeleton = ({ 
  rows = 10,           // 行数
  columns = 6,         // 列数
  hasToolbar = true,   // 是否显示工具栏
  hasSearch = true,    // 是否显示搜索栏
  hasPagination = true // 是否显示分页
}) => {
  return (
    <Card>
      {/* 搜索栏骨架 */}
      {hasSearch && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Skeleton.Input active style={{ width: 200 }} />
          <Skeleton.Input active style={{ width: 150 }} />
          <Skeleton.Input active style={{ width: 150 }} />
          <Space>
            <Skeleton.Button active style={{ width: 80 }} />
            <Skeleton.Button active style={{ width: 80 }} />
          </Space>
        </div>
      )}

      {/* 工具栏骨架 */}
      {hasToolbar && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Skeleton.Button active style={{ width: 100 }} />
            <Skeleton.Button active style={{ width: 100 }} />
          </Space>
          <Space>
            <Skeleton.Button active style={{ width: 80 }} />
            <Skeleton.Button active style={{ width: 80 }} />
          </Space>
        </div>
      )}

      {/* 表格骨架 */}
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
        {/* 表头 */}
        <div style={{ 
          display: 'flex', 
          background: '#fafafa', 
          borderBottom: '1px solid #f0f0f0',
          padding: '12px 16px'
        }}>
          <div style={{ width: 40 }}>
            <Skeleton.Button active size="small" style={{ width: 16, minWidth: 16 }} />
          </div>
          {[...Array(columns)].map((_, index) => (
            <div key={index} style={{ flex: 1, paddingRight: 16 }}>
              <Skeleton.Input active size="small" style={{ width: '80%' }} />
            </div>
          ))}
          <div style={{ width: 120 }}>
            <Skeleton.Input active size="small" style={{ width: '100%' }} />
          </div>
        </div>

        {/* 表格行 */}
        {[...Array(rows)].map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            style={{ 
              display: 'flex', 
              borderBottom: rowIndex < rows - 1 ? '1px solid #f0f0f0' : 'none',
              padding: '16px',
              alignItems: 'center'
            }}
          >
            <div style={{ width: 40 }}>
              <Skeleton.Button active size="small" style={{ width: 16, minWidth: 16 }} />
            </div>
            {[...Array(columns)].map((_, colIndex) => (
              <div key={colIndex} style={{ flex: 1, paddingRight: 16 }}>
                <Skeleton.Input 
                  active 
                  size="small" 
                  style={{ width: `${Math.random() * 40 + 50}%` }} 
                />
              </div>
            ))}
            <div style={{ width: 120 }}>
              <Space>
                <Skeleton.Button active size="small" style={{ width: 50, minWidth: 50 }} />
                <Skeleton.Button active size="small" style={{ width: 50, minWidth: 50 }} />
              </Space>
            </div>
          </div>
        ))}
      </div>

      {/* 分页骨架 */}
      {hasPagination && (
        <div style={{ 
          marginTop: 16, 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          gap: 8
        }}>
          <Skeleton.Input active size="small" style={{ width: 100 }} />
          <Space>
            <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
            <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
            <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
            <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
            <Skeleton.Button active size="small" style={{ width: 32, minWidth: 32 }} />
          </Space>
          <Skeleton.Input active size="small" style={{ width: 80 }} />
        </div>
      )}
    </Card>
  );
};

export default TableSkeleton;

// {{END_MODIFICATIONS}}