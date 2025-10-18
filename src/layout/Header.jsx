// src/features/dashboard/components/Header.jsx
import React from "react";
import "./Header.css";

function Header({ onMenuClick }) {
  return (
    <header className="header">
      <button onClick={onMenuClick} className="menu-button">
        ☰ {/* 1. Caracter '☰' corregido */}
      </button>
      <div className="battery-status">
        <span>21%</span>
        <div className="battery-icon">
          <div className="battery-level" style={{ width: "21%" }}></div>
        </div>
      </div>
    </header>
  );
}

export default Header;
