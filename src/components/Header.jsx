// src/components/Header.jsx
import React from 'react';
import './Header.css';

function Header({ onMenuClick }) { 
  return (
    <header className="header">
      <button onClick={onMenuClick} className="menu-button">
        ☰
      </button>
      <div className="battery-status">
        <span>69%</span>
        <div className="battery-icon">
          <div className="battery-level" style={{ width: '80%' }}></div>
        </div>
      </div>
    </header>
  );
}

export default Header;