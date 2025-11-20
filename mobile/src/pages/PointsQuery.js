import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, Button, Card, Cell, Empty, Toast } from 'react-vant';
import { Plus, Minus } from '@react-vant/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI, utils } from '../services/api';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const PointsQuery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [pointsRecords, setPointsRecords] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const response = await authAPI.getSummary();
      setUserInfo(response?.data?.user || null);
      setPointsRecords(response?.data?.records || []);
      setHasLoaded(true);
    } catch (error) {
      console.error('积分查询失败:', error);
      Toast.fail(error?.response?.data?.message || error.message || '积分查询失败，请稍后重试');
      setUserInfo(null);
      setPointsRecords([]);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const renderStatsCard = () => {
    if (!userInfo) return null;
    return (
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: '#969799' }}>当前用户</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600 }}>
              {userInfo.username || userInfo.user_id}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, color: '#007AFF', fontWeight: 600 }}>
              {utils.formatNumber(userInfo.available_points)}
            </div>
            <div style={{ fontSize: 14, color: '#969799' }}>可用积分</div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 16 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{utils.formatNumber(userInfo.total_points)}</div>
            <div style={{ fontSize: 12, color: '#969799' }}>累计积分</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{utils.formatNumber(userInfo.used_points)}</div>
            <div style={{ fontSize: 12, color: '#969799' }}>已用积分</div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="page-container">
      <NavBar 
        title="积分查询" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        <Card>
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 14, color: '#969799', marginBottom: 8 }}>
              当前用户ID
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {user?.user_id || '-'}
            </div>
            <Button
              type="primary"
              block
              loading={loading}
              onClick={loadSummary}
              style={{ marginTop: 16 }}
            >
              刷新积分
            </Button>
          </div>
        </Card>

        {hasLoaded && (
          <>
            {userInfo ? (
              <>
                {renderStatsCard()}

                <Card style={{ marginTop: 12 }}>
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ 
                      fontSize: 16, 
                      fontWeight: 600, 
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Icon name="clock-o" color="#007AFF" />
                      积分记录
                    </div>
                    
                    {pointsRecords.length > 0 ? (
                      <Cell.Group inset={false}>
                        {pointsRecords.map((record, index) => (
                          <Cell
                            key={record.id || index}
                            title={
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {record.points > 0 ? (
                                  <Plus color="var(--success-color)" style={{ marginRight: '12px' }} />
                                ) : (
                                  <Minus color="var(--danger-color)" style={{ marginRight: '12px' }} />
                                )}
                                <div>
                                  <div style={{ marginBottom: 4 }}>
                                    {record.description || record.source}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#969799' }}>
                                    {utils.formatDate(record.created_at, 'YYYY-MM-DD HH:mm')}
                                  </div>
                                </div>
                              </div>
                            }
                            value={
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                  fontSize: 16, 
                                  fontWeight: 600,
                                  color: record.points > 0 ? '#34C759' : '#FF3B30'
                                }}>
                                  {record.points > 0 ? '+' : ''}{utils.formatNumber(record.points)}
                                </div>
                                <div style={{ fontSize: 12, color: '#969799', marginTop: 2 }}>
                                  余额: {utils.formatNumber(record.balance_after)}
                                </div>
                              </div>
                            }
                            border={index < pointsRecords.length - 1}
                          />
                        ))}
                      </Cell.Group>
                    ) : (
                      <Empty description="暂无积分记录" imageSize={60} />
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card style={{ marginTop: 12 }}>
                <Empty 
                  description="未找到用户信息" 
                  imageSize={80}
                >
                  <div style={{ marginTop: 16, color: '#969799', fontSize: 14 }}>
                    请联系管理员处理
                  </div>
                </Empty>
              </Card>
            )}
          </>
        )}

        {!hasLoaded && (
          <Card style={{ marginTop: 12 }}>
            <Empty description="正在加载中" imageSize={60} />
          </Card>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
};

export default PointsQuery;
