import React, { useState, useEffect, useRef } from 'react';
import {
  NavBar,
  Card,
  Button,
  Toast,
  Dialog
} from 'react-vant';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import Icon from '../components/Icon';

const QRScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      // 组件卸载时停止摄像头
      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
        scanAnimationRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // 使用后置摄像头
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        await video.play();
        setIsScanning(true);
        startScanning();
      }
    } catch (err) {
      console.error('摄像头调用失败:', err);
      setError('无法打开摄像头，请检查权限设置');
      Toast.fail('无法打开摄像头');
    }
  };

  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanAnimationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        scanAnimationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code?.data) {
        handleScanResult(code.data);
        return;
      }

      scanAnimationRef.current = requestAnimationFrame(scanFrame);
    };

    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
    }
    scanAnimationRef.current = requestAnimationFrame(scanFrame);
  };

  // �������ά�����л�ȡ�û�ID
  const extractUserId = (payload) => {
    if (!payload) return '';
    const text = payload.trim();
    if (!text) return '';

    if (/^USER_ID_/i.test(text)) {
      return text.replace(/^USER_ID_/i, '');
    }

    if (/^[A-Za-z0-9_-]+$/.test(text)) {
      return text;
    }

    try {
      const url = new URL(text);
      const idFromQuery = url.searchParams.get('user_id') || url.searchParams.get('userId');
      if (idFromQuery) {
        return idFromQuery;
      }
    } catch (error) {
      // ���� URL ������Բ����κβ���
    }

    const match = text.match(/user[_-]?id[:=]?([A-Za-z0-9_-]+)/i);
    return match ? match[1] : '';
  };


  const handleScanResult = (data) => {
    stopCamera();
    
    const userId = extractUserId(data);
    if (userId) {
      Dialog.confirm({
        title: '扫码成功',
        message: `检测到用户ID: ${userId}，是否查询该用户的积分？`,
      }).then(() => {
        // 跳转到积分查询页面并携带用户ID
        navigate(`/points-query?userId=${userId}`);
      }).catch(() => {
        // 用户取消后重新开始扫描
        startCamera();
      });
    } else {
      Toast.fail('未识别到有效的用户ID');
      setTimeout(() => {
        startCamera();
      }, 1000);
    }
  };


  const handleManualInput = () => {
    navigate('/points-query');
  };

  return (
    <div className="page-container">
      <NavBar 
        title="扫描二维码" 
        leftArrow={<Icon name="arrow-left" />}
        onClickLeft={() => navigate(-1)}
        fixed 
        placeholder
      />
      
      <div className="page-content">
        {/* 扫描区域 */}
        <Card>
          <div style={{ 
            position: 'relative',
            width: '100%',
            height: '300px',
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
                
                {/* 扫描框 */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: '2px solid #007AFF',
                  borderRadius: '8px',
                  background: 'transparent'
                }}>
                  {/* 四个角的装饰 */}
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    width: '20px',
                    height: '20px',
                    borderTop: '4px solid #007AFF',
                    borderLeft: '4px solid #007AFF'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderTop: '4px solid #007AFF',
                    borderRight: '4px solid #007AFF'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '4px solid #007AFF',
                    borderLeft: '4px solid #007AFF'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '4px solid #007AFF',
                    borderRight: '4px solid #007AFF'
                  }} />
                </div>
                
                {/* 扫描线动画 */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '180px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #007AFF, transparent)',
                  animation: 'scan 2s linear infinite'
                }} />
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#969799'
              }}>
                <Icon name="scan" size="48px" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '14px' }}>
                  {error || '点击下方按钮开始扫描'}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 操作按钮 */}
        <Card style={{ marginTop: '16px' }}>
          <div style={{ padding: '16px 0' }}>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: 'column'
            }}>
              {!isScanning ? (
                <Button 
                  type="primary" 
                  size="large"
                  onClick={startCamera}
                  icon={<Icon name="scan" />}
                >
                  开始扫描
                </Button>
              ) : (
                <Button 
                  type="default" 
                  size="large"
                  onClick={stopCamera}
                >
                  停止扫描
                </Button>
              )}
              
              <Button 
                type="default" 
                size="large"
                onClick={handleManualInput}
              >
                手动输入用户ID
              </Button>
            </div>
          </div>
        </Card>

        {/* 使用说明 */}
        <Card style={{ marginTop: '16px' }}>
          <div style={{ padding: '16px 0' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px'
            }}>
              使用说明
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#646566',
              lineHeight: '1.6'
            }}>
              <div style={{ marginBottom: '8px' }}>
                1. 点击"开始扫描"按钮启动摄像头
              </div>
              <div style={{ marginBottom: '8px' }}>
                2. 将二维码对准扫描框内
              </div>
              <div style={{ marginBottom: '8px' }}>
                3. 扫描成功后会自动跳转到积分查询页面
              </div>
              <div>
                4. 如果扫描失败，可以选择手动输入用户ID
              </div>
            </div>
          </div>
        </Card>

        {/* 底部安全区域 */}
        <div style={{ height: '20px' }} />
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translate(-50%, -90px);
          }
          100% {
            transform: translate(-50%, 90px);
          }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
