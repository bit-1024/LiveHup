// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:50:47Z
//   Phase: D-Develop
//   Context-Analysis: "创建表单骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, Row, Col, Skeleton, Space } from 'antd';

/**
 * 表单骨架屏组件
 * 用于表单页面加载时显示
 */
const FormSkeleton = ({ 
  fields = 6,          // 字段数量
  columns = 2,         // 每行列数
  hasTitle = true,     // 是否显示标题
  hasActions = true    // 是否显示操作按钮
}) => {
  const colSpan = 24 / columns;
  const fieldRows = Math.ceil(fields / columns);

  return (
    <Card>
      {/* 标题 */}
      {hasTitle && (
        <div style={{ marginBottom: 24 }}>
          <Skeleton.Input active style={{ width: 200 }} size="large" />
        </div>
      )}

      {/* 表单字段 */}
      {[...Array(fieldRows)].map((_, rowIndex) => (
        <Row gutter={24} key={rowIndex} style={{ marginBottom: 24 }}>
          {[...Array(columns)].map((_, colIndex) => {
            const fieldIndex = rowIndex * columns + colIndex;
            if (fieldIndex >= fields) return null;
            
            return (
              <Col span={colSpan} key={colIndex}>
                <div style={{ marginBottom: 8 }}>
                  <Skeleton.Input active style={{ width: 80 }} size="small" />
                </div>
                <Skeleton.Input active style={{ width: '100%' }} />
              </Col>
            );
          })}
        </Row>
      ))}

      {/* 操作按钮 */}
      {hasActions && (
        <div style={{ 
          marginTop: 24, 
          paddingTop: 24, 
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Space>
            <Skeleton.Button active style={{ width: 80 }} />
            <Skeleton.Button active style={{ width: 80 }} />
          </Space>
        </div>
      )}
    </Card>
  );
};

/**
 * 详情表单骨架屏
 * 用于详情页面加载时显示
 */
export const DetailFormSkeleton = ({ 
  sections = 2,        // 分组数量
  fieldsPerSection = 4 // 每组字段数
}) => {
  return (
    <div>
      {[...Array(sections)].map((_, sectionIndex) => (
        <Card 
          key={sectionIndex} 
          style={{ marginBottom: 16 }}
          title={<Skeleton.Input active style={{ width: 120 }} />}
        >
          <Row gutter={[24, 16]}>
            {[...Array(fieldsPerSection)].map((_, fieldIndex) => (
              <Col xs={24} sm={12} key={fieldIndex}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 100, color: '#999' }}>
                    <Skeleton.Input active style={{ width: 60 }} size="small" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Skeleton.Input active style={{ width: '80%' }} size="small" />
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      ))}
    </div>
  );
};

/**
 * 编辑表单骨架屏
 * 用于编辑页面加载时显示
 */
export const EditFormSkeleton = () => {
  return (
    <Card>
      {/* 基本信息 */}
      <div style={{ marginBottom: 32 }}>
        <Skeleton.Input active style={{ width: 100, marginBottom: 16 }} />
        <Row gutter={24}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <Skeleton.Input active style={{ width: 60 }} size="small" />
            </div>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <Skeleton.Input active style={{ width: 60 }} size="small" />
            </div>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
        </Row>
      </div>

      {/* 详细信息 */}
      <div style={{ marginBottom: 32 }}>
        <Skeleton.Input active style={{ width: 100, marginBottom: 16 }} />
        <Row gutter={24}>
          <Col span={24}>
            <div style={{ marginBottom: 8 }}>
              <Skeleton.Input active style={{ width: 60 }} size="small" />
            </div>
            <Skeleton.Input active style={{ width: '100%', height: 100 }} />
          </Col>
        </Row>
      </div>

      {/* 图片上传 */}
      <div style={{ marginBottom: 32 }}>
        <Skeleton.Input active style={{ width: 100, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          {[1, 2, 3].map((item) => (
            <div 
              key={item}
              style={{ 
                width: 104, 
                height: 104, 
                border: '1px dashed #d9d9d9',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Skeleton.Image active style={{ width: 80, height: 80 }} />
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ 
        paddingTop: 24, 
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <Space>
          <Skeleton.Button active style={{ width: 80 }} />
          <Skeleton.Button active style={{ width: 80 }} />
        </Space>
      </div>
    </Card>
  );
};

export default FormSkeleton;

// {{END_MODIFICATIONS}}