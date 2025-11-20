import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, Card, Cell, Empty, Toast, PullRefresh } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { authAPI, utils } from '../services/api';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus } from '@react-vant/icons';

const PointsDetails = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [pointsRecords, setPointsRecords] = useState([]);
  const [groupedRecords, setGroupedRecords] = useState({});

  const loadDetails = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const response = await authAPI.getSummary();
      setUserInfo(response?.data?.user || null);
      setPointsRecords(response?.data?.records || []);
    } catch (error) {
      Toast.fail(error?.response?.data?.message || '获取积分明细失败');
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    // Group records by date
    const groups = pointsRecords.reduce((acc, record) => {
      const date = utils.formatDate(record.created_at, 'YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});
    setGroupedRecords(groups);
  }, [pointsRecords]);

  const handleRefresh = async () => {
    await loadDetails();
  };

  const renderRecords = () => {
    const dates = Object.keys(groupedRecords).sort((a, b) => new Date(b) - new Date(a));
    if (dates.length === 0) {
      return <Empty description="暂无积分记录" />;
    }

    return dates.map(date => (
      <div key={date} style={{ marginBottom: 16 }}>
        <div style={{ padding: '0 16px 8px', fontSize: 14, color: 'var(--text-color-secondary)' }}>
          {utils.formatDate(date, 'YYYY年MM月DD日')}
        </div>
        <Card style={{ borderRadius: '12px' }}>
          <Cell.Group inset={false}>
            {groupedRecords[date].map(record => (
              <Cell
                key={record.id}
                title={record.description || record.source}
                label={utils.formatDate(record.created_at, 'HH:mm')}
                value={
                  <div style={{
                    color: record.points > 0 ? 'var(--success-color)' : 'var(--danger-color)',
                    fontWeight: 700,
                    fontSize: '18px'
                  }}>
                    {record.points > 0 ? '+' : ''}{utils.formatNumber(record.points)}
                  </div>
                }
                icon={
                  record.points > 0 ?
                  <Plus size={20} color="var(--success-color)" style={{ marginRight: 12 }} /> :
                  <Minus size={20} color="var(--danger-color)" style={{ marginRight: 12 }} />
                }
                style={{ alignItems: 'center' }}
              />
            ))}
          </Cell.Group>
        </Card>
      </div>
    ));
  };

  return (
    <div className="page-container">
      <NavBar 
        title="积分明细" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <PullRefresh onRefresh={handleRefresh} loading={loading}>
        <div className="page-content" style={{ paddingBottom: '20px' }}>
          {/* Points Summary Card */}
          <Card style={{ marginBottom: 24, borderRadius: '12px' }}>
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-color-secondary)', marginBottom: 8 }}>
                可用积分
              </div>
              <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--primary-color)', lineHeight: 1 }}>
                {loading ? '...' : utils.formatNumber(userInfo?.available_points || 0)}
              </div>
            </div>
            <div style={{ borderTop: '0.5px solid var(--border-color)', display: 'flex' }}>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginBottom: 4 }}>累计获得</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {loading ? '...' : utils.formatNumber(userInfo?.total_points || 0)}
                </div>
              </div>
              <div style={{ width: '0.5px', background: 'var(--border-color)' }} />
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginBottom: 4 }}>已使用</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {loading ? '...' : utils.formatNumber(userInfo?.used_points || 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Points Records */}
          {renderRecords()}
        </div>
      </PullRefresh>
    </div>
  );
};

export default PointsDetails;