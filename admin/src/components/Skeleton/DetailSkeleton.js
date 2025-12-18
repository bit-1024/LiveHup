// {{CODE-Cycle-Integration:
//   Task_ID: [#T011]
//   Timestamp: 2025-12-17T01:51:13Z
//   Phase: D-Develop
//   Context-Analysis: "创建详情页骨架屏组件"
//   Principle_Applied: "Loading-State, User-Experience, Ant-Design"
// }}
// {{START_MODIFICATIONS}}

import React from 'react';
import { Card, Row, Col, Skeleton, Divider } from 'antd';

/**
 * 详情页骨架屏组件
 * 用于详情页面加载时显示
 */
const DetailSkeleton = ({ 
  hasImage = true,     // 是否显示图片
  hasTimeline = false, // 是否显示时间线
  sections = 2         // 信息分组数量
}) => {
  return (
    <div>
      {/* 头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          {hasImage && (
            <Col xs={24} sm={8} md={6}>
              <Skeleton.Image active style={{ width: '100%', height: 200 }} />
            </Col>
          )}
          <Col xs={24} sm={hasImage ? 16 : 24} md={hasImage ? 18 : 24}>
            <Skeleton.Input active style={{ width: 200, marginBottom: 16 }} size="large" />
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4].map((item) => (
                <Col xs={12} sm={6} key={item}>
                  <Skeleton.Input active style={{ width: 60, marginBottom: 4 }} size="small" />
                  <Skeleton.Input active style={{ width: '100%' }} size="small" />
                </Col>
              ))}
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Skeleton.Button active style={{ width: 80 }} />
              <Skeleton.Button active style={{ width: 80 }} />
              <Skeleton.Button active style={{ width: 80 }} />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 详细信息分组 */}
      {[...Array(sections)].map((_, sectionIndex) => (
        <Card 
          key={sectionIndex} 
          style={{ marginBottom: 16 }}
          title={<Skeleton.Input active style={{ width: 120 }} />}
        >
          <Row gutter={[24, 16]}>
            {[...Array(6)].map((_, fieldIndex) => (
              <Col xs={24} sm={12} md={8} key={fieldIndex}>
                <div style={{ marginBottom: 4 }}>
                  <Skeleton.Input active style={{ width: 80 }} size="small" />
                </div>
                <Skeleton.Input active style={{ width: '90%' }} size="small" />
              </Col>
            ))}
          </Row>
        </Card>
      ))}

      {/* 时间线 */}
      {hasTimeline && (
        <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ display: 'flex', marginBottom: 24 }}>
              <div style={{ marginRight: 16 }}>
                <Skeleton.Avatar active size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <Skeleton.Input active style={{ width: 150, marginBottom: 8 }} size="small" />
                <Skeleton.Input active style={{ width: '80%' }} size="small" />
              </div>
              <div>
                <Skeleton.Input active style={{ width: 100 }} size="small" />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

/**
 * 用户详情骨架屏
 */
export const UserDetailSkeleton = () => {
  return (
    <div>
      {/* 用户基本信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Skeleton.Avatar active size={80} style={{ marginRight: 24 }} />
          <div>
            <Skeleton.Input active style={{ width: 150, marginBottom: 8 }} size="large" />
            <Skeleton.Input active style={{ width: 200 }} size="small" />
          </div>
        </div>
        <Row gutter={[24, 16]}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Col xs={24} sm={12} md={8} key={item}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 80, color: '#999' }}>
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

      {/* 积分信息 */}
      <Card title={<Skeleton.Input active style={{ width: 100 }} />} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {[1, 2, 3, 4].map((item) => (
            <Col xs={12} sm={6} key={item}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Skeleton.Input active style={{ width: 80, marginBottom: 8 }} size="small" />
                <Skeleton.Input active style={{ width: 60 }} size="large" />
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 积分记录 */}
      <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
        {[1, 2, 3, 4, 5].map((item) => (
          <div 
            key={item} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: item < 5 ? '1px solid #f0f0f0' : 'none'
            }}
          >
            <div>
              <Skeleton.Input active style={{ width: 150, marginBottom: 4 }} size="small" />
              <Skeleton.Input active style={{ width: 100 }} size="small" />
            </div>
            <Skeleton.Input active style={{ width: 60 }} size="small" />
          </div>
        ))}
      </Card>
    </div>
  );
};

/**
 * 订单详情骨架屏
 */
export const OrderDetailSkeleton = () => {
  return (
    <div>
      {/* 订单状态 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Skeleton.Avatar active size={64} style={{ marginBottom: 16 }} />
          <Skeleton.Input active style={{ width: 120 }} size="large" />
        </div>
      </Card>

      {/* 商品信息 */}
      <Card title={<Skeleton.Input active style={{ width: 100 }} />} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Skeleton.Image active style={{ width: 80, height: 80, marginRight: 16 }} />
          <div style={{ flex: 1 }}>
            <Skeleton.Input active style={{ width: '60%', marginBottom: 8 }} size="small" />
            <Skeleton.Input active style={{ width: 100 }} size="small" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <Skeleton.Input active style={{ width: 80, marginBottom: 8 }} size="small" />
            <Skeleton.Input active style={{ width: 60 }} size="small" />
          </div>
        </div>
      </Card>

      {/* 收货信息 */}
      <Card title={<Skeleton.Input active style={{ width: 100 }} />} style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]}>
          {[1, 2, 3].map((item) => (
            <Col xs={24} sm={8} key={item}>
              <div style={{ marginBottom: 4 }}>
                <Skeleton.Input active style={{ width: 60 }} size="small" />
              </div>
              <Skeleton.Input active style={{ width: '90%' }} size="small" />
            </Col>
          ))}
        </Row>
      </Card>

      {/* 订单信息 */}
      <Card title={<Skeleton.Input active style={{ width: 100 }} />}>
        <Row gutter={[24, 16]}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Col xs={24} sm={12} key={item}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 100 }}>
                  <Skeleton.Input active style={{ width: 80 }} size="small" />
                </div>
                <div style={{ flex: 1 }}>
                  <Skeleton.Input active style={{ width: '80%' }} size="small" />
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default DetailSkeleton;

// {{END_MODIFICATIONS}}