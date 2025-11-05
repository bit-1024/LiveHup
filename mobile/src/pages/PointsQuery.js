import React, { useState, useEffect, useCallback } from 'react';
import {
  NavBar,
  Field,
  Button,
  Card,
  Cell,
  Tag,
  Empty,
  Divider,
  Toast
} from 'react-vant';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userAPI, pointsAPI, utils } from '../services/api';
import Icon from '../components/Icon';

const PointsQuery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [pointsRecords, setPointsRecords] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);

  const handleQuery = useCallback(async (rawUserId) => {
    const targetUserId = (rawUserId || '').trim();
    
    if (!targetUserId) {
      Toast.fail('�������û�ID');
      return;
    }
    
    try {
      setLoading(true);
      
      // ��ȡ�û�������Ϣ
      const userResponse = await userAPI.getPoints(targetUserId);
      setUserInfo(userResponse.data);
      
      // ��ȡ���ּ�¼
      const recordsResponse = await pointsAPI.getRecords(targetUserId, {
        page: 1,
        pageSize: 20
      });
      setPointsRecords(recordsResponse.data.list || []);
      
      setHasQueried(true);
    } catch (error) {
      console.error('��ѯʧ��:', error);
      setUserInfo(null);
      setPointsRecords([]);
      setHasQueried(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ���URL�������Ƿ����û�ID
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      // �Զ���ѯ
      handleQuery(userIdFromUrl);
    }
  }, [searchParams, handleQuery]);


  const handleReset = () => {
    setUserId('');
    setUserInfo(null);
    setPointsRecords([]);
    setHasQueried(false);
  };

  const getSourceText = (source) => {
    const sourceMap = {
      import: '数据导入',
      exchange: '积分兑换',
      manual: '手动调整',
      expire: '积分过期'
    };
    return sourceMap[source] || source;
  };

  return (
    <div className="page-container">
      <NavBar 
        title="积分查询" 
        leftArrow
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 查询表单 */}
        <Card>
          <div style={{ padding: '16px 0' }}>
            <Field
              value={userId}
              onChange={setUserId}
              label="用户ID"
              placeholder="请输入您的用户ID"
              clearable
              maxlength={50}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <Button
                type="primary"
                block
                loading={loading}
                onClick={() => handleQuery(userId)}
                icon={<Icon name="search" />}
              >
                查询积分
              </Button>
              {hasQueried && (
                <Button 
                  block 
                  onClick={handleReset}
                  style={{ flex: '0 0 80px' }}
                >
                  重置
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 查询结果 */}
        {hasQueried && (
          <>
            {userInfo ? (
              <>
                {/* 积分概览 */}
                <Card style={{ marginTop: '12px' }}>
                  <div className="stats-card">
                    <div className="stats-number">
                      {utils.formatNumber(userInfo.available_points)}
                    </div>
                    <div className="stats-label">当前可用积分</div>
                  </div>
                </Card>

                {/* 积分详情 */}
                <Card style={{ marginTop: '12px' }}>
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Icon name="point-gift-o" color="#1989fa" />
                      积分详情
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#1989fa' }}>
                          {utils.formatNumber(userInfo.total_points)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#969799', marginTop: '4px' }}>
                          历史总积分
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ee0a24' }}>
                          {utils.formatNumber(userInfo.used_points)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#969799', marginTop: '4px' }}>
                          已使用积分
                        </div>
                      </div>
                    </div>

                    <Divider />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#969799' }}>
                          {utils.formatNumber(userInfo.expired_points)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#969799', marginTop: '4px' }}>
                          已过期积分
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#07c160' }}>
                          {userInfo.is_new_user ? '新用户' : '老用户'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#969799', marginTop: '4px' }}>
                          用户类型
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 积分记录 */}
                <Card style={{ marginTop: '12px' }}>
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Icon name="clock-o" color="#1989fa" />
                      积分记录
                    </div>
                    
                    {pointsRecords.length > 0 ? (
                      <Cell.Group inset={false}>
                        {pointsRecords.map((record, index) => (
                          <Cell
                            key={record.id || index}
                            title={
                              <div>
                                <div style={{ marginBottom: '4px' }}>
                                  {getSourceText(record.source)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#969799' }}>
                                  {utils.formatDate(record.created_at, 'YYYY-MM-DD HH:mm')}
                                </div>
                              </div>
                            }
                            label={record.description}
                            value={
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '600',
                                  color: record.points > 0 ? '#07c160' : '#ee0a24'
                                }}>
                                  {record.points > 0 ? '+' : ''}{utils.formatNumber(record.points)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#969799', marginTop: '2px' }}>
                                  余额: {utils.formatNumber(record.balance_after)}
                                </div>
                              </div>
                            }
                            border={index < pointsRecords.length - 1}
                          />
                        ))}
                      </Cell.Group>
                    ) : (
                      <Empty 
                        description="暂无积分记录" 
                        imageSize={60}
                      />
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card style={{ marginTop: '12px' }}>
                <Empty 
                  description="未找到该用户信息" 
                  imageSize={80}
                >
                  <div style={{ marginTop: '16px', color: '#969799', fontSize: '14px' }}>
                    请检查用户ID是否正确
                  </div>
                </Empty>
              </Card>
            )}
          </>
        )}

        {/* 使用提示 */}
        {!hasQueried && (
          <Card style={{ marginTop: '12px' }}>
            <div style={{ padding: '16px 0' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px',
                color: '#323233'
              }}>
                使用说明
              </div>
              <div style={{ lineHeight: '1.6', color: '#646566', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 请输入您的用户ID进行积分查询
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 用户ID通常在参与活动时获得
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  • 如忘记用户ID，请联系客服获取
                </p>
                <p style={{ margin: '0' }}>
                  • 积分有效期请关注具体活动规则
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 底部安全区域 */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default PointsQuery;


