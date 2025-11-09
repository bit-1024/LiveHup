import React, { useState, useEffect } from 'react';
import './Logo.css';

const getInitialSettings = () => {
  const savedSettings = localStorage.getItem('systemSettings');
  if (savedSettings) {
    return JSON.parse(savedSettings);
  }
  return {
    systemName: '社群直播积分系统',
    logoUrl: null
  };
};

const Logo = ({ collapsed }) => {
  const [settings, setSettings] = useState(getInitialSettings);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="logo-container">
      <div className="logo-icon">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" />
        ) : (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="20" fill="url(#gradient)" />
            <path d="M18 24l4 4 8-8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="#FFD700" />
            <defs>
              <linearGradient id="gradient" x1="4" y1="4" x2="44" y2="44">
                <stop offset="0%" stopColor="#FF6B6B" />
                <stop offset="50%" stopColor="#4ECDC4" />
                <stop offset="100%" stopColor="#45B7D1" />
              </linearGradient>
              <linearGradient id="gradient2" x1="10" y1="10" x2="38" y2="38">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>
      {!collapsed && <span className="logo-text">{settings.systemName}</span>}
    </div>
  );
};

export default Logo;