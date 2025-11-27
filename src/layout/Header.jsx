// src/layout/Header.jsx
import React, { useState } from "react";
import "./Header.css";
import { useRobotStore } from "../store/robotStore.js";
import { useTheme } from "../context/ThemeContext.jsx";
import Modal from "../components/Modal.jsx";
import BatteryModal from "../features/dashboard/components/BatteryModal.jsx";

function Header({ onMenuClick }) {
  const battery = useRobotStore((state) => state.battery);
  const isConnected = useRobotStore((state) => state.isConnected);

  const { percentage, status } = battery;
  const { isDarkMode, toggleTheme } = useTheme();
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);

  const openBatteryModal = () => setIsBatteryModalOpen(true);
  const closeBatteryModal = () => setIsBatteryModalOpen(false);

  const getBatteryClass = () => {
    if (status === "CHARGING") return "charging";
    if (percentage < 10) return "critical";
    if (percentage <= 50) return "low";
    return "good";
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button
            onClick={onMenuClick}
            className="menu-button"
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div
            className={`system-status-pill ${
              isConnected ? "online" : "offline"
            }`}
            title={isConnected ? "Sistema Conectado" : "Desconectado"}
          >
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <div className="header-right-controls">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <div
            className={`battery-widget clickable ${getBatteryClass()}`}
            onClick={openBatteryModal}
            title={`Batería: ${percentage}%`}
          >
            <span className="battery-text">
              {status === "CHARGING" && (
                <span className="charging-bolt">⚡</span>
              )}
              {percentage}%
            </span>
            <div className="battery-icon">
              <div
                className="battery-fill"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={isBatteryModalOpen}
        onClose={closeBatteryModal}
        title="Detalle de Energía"
      >
        {/*Pasar la función onClose al hijo */}
        <BatteryModal onClose={closeBatteryModal} />
      </Modal>
    </>
  );
}

export default Header;
