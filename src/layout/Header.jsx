// src/layout/Header.jsx
import React from "react";
import "./Header.css";
import { useRobotStore } from "../store/robotStore"; // 1. Importar el store

function Header({ onMenuClick }) {
  // 2. Conectar al estado global
  // Seleccionamos solo el dato que este componente necesita.
  const batteryPercentage = useRobotStore((state) => state.battery.percentage);

  return (
    <header className="header">
      <button onClick={onMenuClick} className="menu-button">
        ☰
      </button>
      <div className="battery-status">
        {/* 3. Usar el dato del store */}
        <span>{batteryPercentage}%</span>
        <div className="battery-icon">
          {/* 4. La barra de batería también es dinámica ahora */}
          <div
            className="battery-level"
            style={{ width: `${batteryPercentage}%` }}
          ></div>
        </div>
      </div>
    </header>
  );
}

export default Header;
