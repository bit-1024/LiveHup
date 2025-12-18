// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:49:42Z
//   Phase: D-Develop
//   Context-Analysis: "创建仪表盘骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, Row, Col, Skeleton } from 'antd';

/**
 * 仪表盘骨架屏组件
 * 用于仪表盘页面加载时显示
 */
const DashboardSkeleton = () => {
  return (
    <div className="dashboard-skeleton">
      {/* 统计卡片骨架 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((item) => (
          <Col xs={24} sm={12} lg={6} key={item}>
            <Card>
              <Skeleton.Input active style={{ width: 80, marginBottom: 8 }} size="small" />
              <Skeleton.Input active style={{ width: 120 }} size="large" />
              <div style={{ marginTop: 8 }}>
                <Skeleton.Input active style={{ width: 100 }} size="small" />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域骨架 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card>
            <Skeleton.Input active style={{ width: 150, marginBottom: 16 }} />
            <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              {[...Array(12)].map((_, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${Math.random() * 60 + 40}%`,
                    background: 'linear-gradient(180deg, #f0f0f0 0%, #e8e8e8 100%)',
                    borderRadius: '4px 4px 0 0',
                    animation: 'skeleton-loading 1.4s ease infinite',
                  }}
                />
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Skeleton.Input active style={{ width: 120, marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'conic-gradient(#f0f0f0 0deg, #e8e8e8 90deg, #f5f5f5 180deg, #f0f0f0 270deg, #e8e8e8 360deg)',
                  animation: 'skeleton-loading 1.4s ease infinite',
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 列表区域骨架 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <Skeleton.Input active style={{ width: 150, marginBottom: 16 }} />
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Skeleton.Avatar active size={40} style={{ marginRight: 12 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton.Input active style={{ width: '60%', marginBottom: 4 }} size="small" />
                  <Skeleton.Input active style={{ width: '40%' }} size="small" />
                </div>
                <Skeleton.Input active style={{ width: 60 }} size="small" />
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <Skeleton.Input active style={{ width: 150, marginBottom: 16 }} />
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Skeleton.Image active style={{ width: 60, height: 60, marginRight: 12 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton.Input active style={{ width: '70%', marginBottom: 4 }} size="small" />
                  <Skeleton.Input active style={{ width: '50%' }} size="small" />
                </div>
                <Skeleton.Input active style={{ width: 80 }} size="small" />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <style>{`
        @keyframes skeleton-loading {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardSkeleton;

// {{END_MODIFICATIONS}}