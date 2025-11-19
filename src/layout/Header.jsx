// src/layout/Header.jsx
import React, { useState } from "react";
import "./Header.css";
import { useRobotStore } from "../store/robotStore";
import Modal from "../components/Modal";
import BatteryModal from "../features/dashboard/components/BatteryModal";

function Header({ onMenuClick }) {
  // Extraemos el objeto completo para acceder a percentage y status
  const battery = useRobotStore((state) => state.battery);
  const { percentage, status } = battery;

  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);

  const openBatteryModal = () => setIsBatteryModalOpen(true);
  const closeBatteryModal = () => setIsBatteryModalOpen(false);

  // Determinar la clase CSS basada en el estado y porcentaje
  const getBatteryClass = () => {
    if (status === "CHARGING") return "charging";
    if (percentage <= 20) return "critical";
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

        <div
          className={`battery-widget clickable ${batteryClass}`}
          onClick={openBatteryModal}
          title={`Batería: ${percentage}% - ${
            status === "CHARGING" ? "Cargando" : "En uso"
          }`}
        >
          <span className="battery-text">
            {/* Icono de rayo si está cargando */}
            {status === "CHARGING" && <span className="charging-bolt">⚡</span>}
            {percentage}%
          </span>

          <div className="battery-icon">
            <div
              className="battery-fill"
              style={{ width: `${percentage}%` }}
            ></div>
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
