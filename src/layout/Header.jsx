// src/layout/Header.jsx
import React, { useState } from "react";
import "./Header.css";
import { useRobotStore } from "../store/robotStore";
import { useTheme } from "../context/ThemeContext"; // 1. Importar hook
import Modal from "../components/Modal";
import BatteryModal from "../features/dashboard/components/BatteryModal";

function Header({ onMenuClick }) {
  const battery = useRobotStore((state) => state.battery);
  const { percentage, status } = battery;

  // 2. Usar el contexto del tema
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

  const batteryClass = getBatteryClass();

  return (
    <>
      <header className="header">
        <button
          onClick={onMenuClick}
          className="menu-button"
          aria-label="Abrir menú"
        >
          ☰
        </button>

        {/* Contenedor derecho para Tema + Batería */}
        <div className="header-right-controls">
          {/* 3. Botón Toggle Tema */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={
              isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <div
            className={`battery-widget clickable ${batteryClass}`}
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
        <BatteryModal />
      </Modal>
    </>
  );
}

export default Header;
