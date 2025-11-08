import React from 'react';
import './Logo.css';

const Logo = ({ collapsed }) => {
  return (
    <div className="logo-container">
      <div className="logo-icon">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="20" fill="url(#gradient)" />
          <path d="M24 14v20M14 24h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <defs>
            <linearGradient id="gradient" x1="4" y1="4" x2="44" y2="44">
              <stop offset="0%" stopColor="#007AFF" />
              <stop offset="100%" stopColor="#5856D6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {!collapsed && <span className="logo-text">社群直播积分系统</span>}
    </div>
  );
};

export default Logo;