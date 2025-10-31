import React, { useState, useEffect, useRef } from 'react';
import { 
  NavBar, 
  Card,
  Button,
  Toast,
  Dialog
} from 'vant';
import { ArrowLeft, ScanO } from '@vant/icons';
import { useNavigate } from 'react-router-dom';

const QRScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      // 组件卸载时停止摄像头
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
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsScanning(true);
      
      // 开始扫描
      startScanning();
    } catch (err) {
      console.error('启动摄像头失败:', err);
      setError('无法访问摄像头，请检查权限设置');
      Toast.fail('无法访问摄像头');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    const scanInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current && isScanning) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // 这里应该使用二维码解析库，比如 jsQR
        // 由于没有安装相关库，这里模拟扫描结果
        // 实际项目中需要安装 jsQR 或其他二维码解析库
        
        // 模拟扫描到二维码
        if (Math.random() < 0.1) { // 10% 概率模拟扫描成功
          const mockQRData = 'USER_ID_12345'; // 模拟扫描到的用户ID
          handleScanResult(mockQRData);
          clearInterval(scanInterval);
        }
      }
    }, 500);

    // 10秒后停止扫描
    setTimeout(() => {
      clearInterval(scanInterval);
    }, 10000);
  };

  const handleScanResult = (data) => {
    stopCamera();
    
    // 解析二维码数据
    if (data && data.startsWith('USER_ID_')) {
      const userId = data.replace('USER_ID_', '');
      Dialog.confirm({
        title: '扫描成功',
        message: `检测到用户ID: ${userId}，是否查询该用户的积分？`,
      }).then(() => {
        // 跳转到积分查询页面并传递用户ID
        navigate(`/points-query?userId=${userId}`);
      }).catch(() => {
        // 用户取消，重新开始扫描
        startCamera();
      });
    } else {
      Toast.fail('无效的二维码格式');
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
        leftArrow
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
                  border: '2px solid #1989fa',
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
                    borderTop: '4px solid #1989fa',
                    borderLeft: '4px solid #1989fa'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderTop: '4px solid #1989fa',
                    borderRight: '4px solid #1989fa'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '4px solid #1989fa',
                    borderLeft: '4px solid #1989fa'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '4px solid #1989fa',
                    borderRight: '4px solid #1989fa'
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
                  background: 'linear-gradient(90deg, transparent, #1989fa, transparent)',
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
                <ScanO size="48px" style={{ marginBottom: '12px' }} />
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
                  icon={<ScanO />}
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