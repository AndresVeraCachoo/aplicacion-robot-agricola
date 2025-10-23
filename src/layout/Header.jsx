// src/layout/Header.jsx
import React, { useState } from "react";
import "./Header.css";
import { useRobotStore } from "../store/robotStore";
// --- RUTA DE IMPORTACIÓN ACTUALIZADA ---
import Modal from "../components/Modal";
import BatteryModal from "../features/dashboard/components/BatteryModal";

function Header({ onMenuClick }) {
  const batteryPercentage = useRobotStore((state) => state.battery.percentage);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);

  const openBatteryModal = () => setIsBatteryModalOpen(true);
  const closeBatteryModal = () => setIsBatteryModalOpen(false);

  return (
    <>
      <header className="header">
        <button onClick={onMenuClick} className="menu-button">
          ☰
        </button>
        <div
          className="battery-status clickable"
          onClick={openBatteryModal}
          title="Ver detalles de la batería"
        >
          <span>{batteryPercentage}%</span>
          <div className="battery-icon">
            <div
              className="battery-level"
              style={{ width: `${batteryPercentage}%` }}
            ></div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={isBatteryModalOpen}
        onClose={closeBatteryModal}
        title="Estado de la Batería"
      >
        <BatteryModal />
      </Modal>
    </>
  );
}

export default Header;
