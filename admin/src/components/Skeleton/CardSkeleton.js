// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:50:26Z
//   Phase: D-Develop
//   Context-Analysis: "创建卡片骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, Row, Col, Skeleton } from 'antd';

/**
 * 卡片骨架屏组件
 * 用于卡片列表页面加载时显示
 */
const CardSkeleton = ({ 
  count = 8,           // 卡片数量
  columns = 4,         // 每行列数
  hasImage = true,     // 是否显示图片
  hasAvatar = false,   // 是否显示头像
  hasActions = true    // 是否显示操作按钮
}) => {
  // 计算每列的span
  const colSpan = 24 / columns;

  return (
    <Row gutter={[16, 16]}>
      {[...Array(count)].map((_, index) => (
        <Col xs={24} sm={12} md={colSpan} key={index}>
          <Card
            hoverable
            cover={
              hasImage && (
                <div style={{ 
                  height: 180, 
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Skeleton.Image active style={{ width: '100%', height: '100%' }} />
                </div>
              )
            }
            actions={
              hasActions
                ? [
                    <Skeleton.Button key="1" active size="small" style={{ width: 50 }} />,
                    <Skeleton.Button key="2" active size="small" style={{ width: 50 }} />,
                    <Skeleton.Button key="3" active size="small" style={{ width: 50 }} />,
                  ]
                : undefined
            }
          >
            <Card.Meta
              avatar={hasAvatar && <Skeleton.Avatar active size={40} />}
              title={<Skeleton.Input active style={{ width: '80%' }} size="small" />}
              description={
                <div>
                  <Skeleton.Input active style={{ width: '100%', marginBottom: 8 }} size="small" />
                  <Skeleton.Input active style={{ width: '60%' }} size="small" />
                </div>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

/**
 * 统计卡片骨架屏
 * 用于统计数据卡片加载时显示
 */
export const StatCardSkeleton = ({ count = 4 }) => {
  const colSpan = 24 / count;

  return (
    <Row gutter={[16, 16]}>
      {[...Array(count)].map((_, index) => (
        <Col xs={24} sm={12} lg={colSpan} key={index}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Skeleton.Input active style={{ width: 80, marginBottom: 12 }} size="small" />
                <Skeleton.Input active style={{ width: 120 }} size="large" />
                <div style={{ marginTop: 12 }}>
                  <Skeleton.Input active style={{ width: 100 }} size="small" />
                </div>
              </div>
              <Skeleton.Avatar active size={48} shape="square" />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

/**
 * 商品卡片骨架屏
 * 用于商品列表加载时显示
 */
export const ProductCardSkeleton = ({ count = 8 }) => {
  return (
    <Row gutter={[16, 16]}>
      {[...Array(count)].map((_, index) => (
        <Col xs={24} sm={12} md={8} lg={6} key={index}>
          <Card
            hoverable
            cover={
              <div style={{ 
                height: 200, 
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Skeleton.Image active style={{ width: 120, height: 120 }} />
              </div>
            }
          >
            <Skeleton.Input active style={{ width: '90%', marginBottom: 8 }} size="small" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton.Input active style={{ width: 80 }} size="small" />
              <Skeleton.Input active style={{ width: 60 }} size="small" />
            </div>
            <div style={{ marginTop: 12 }}>
              <Skeleton.Button active block />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default CardSkeleton;

// {{END_MODIFICATIONS}}