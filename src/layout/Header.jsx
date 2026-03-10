// src/layout/Header.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./Header.css";
import { useRobotStore } from "../store/robotStore.js";
import { useTheme } from "../context/ThemeContext.jsx";
import Modal from "../components/Modal.jsx";
import BatteryModal from "../features/dashboard/components/BatteryModal.jsx";

function Header({ onMenuClick }) {
  const { t, i18n } = useTranslation();
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

  // Función para alternar idioma con un solo clic
  const toggleLanguage = () => {
    const currentLang = i18n.language || "es";
    const nextLang = currentLang.startsWith("es") ? "en" : "es";
    i18n.changeLanguage(nextLang);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button
            onClick={onMenuClick}
            className="menu-button"
            aria-label={t("sidebar.menu")}
          >
            ☰
          </button>

          <div
            className={`system-status-pill ${
              isConnected ? "online" : "offline"
            }`}
            title={
              isConnected ? t("header.connected") : t("header.disconnected")
            }
          >
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnected ? t("header.online") : t("header.offline")}
            </span>
          </div>
        </div>

        <div className="header-right-controls">
          {/* Nuevo botón de idioma estilizado */}
          <button
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={
              i18n.language.startsWith("es")
                ? "Switch to English"
                : "Cambiar a Español"
            }
          >
            <span className="lang-icon">🌍</span>
            <span>{i18n.language.startsWith("es") ? "ES" : "EN"}</span>
          </button>

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? t("header.lightMode") : t("header.darkMode")}
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <button
            className={`battery-widget clickable ${getBatteryClass()}`}
            onClick={openBatteryModal}
            title={`${t("header.battery")}: ${percentage}%`}
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
          </button>
        </div>
      </header>

      <Modal
        isOpen={isBatteryModalOpen}
        onClose={closeBatteryModal}
        title={t("header.energyDetail")}
      >
        <BatteryModal onClose={closeBatteryModal} />
      </Modal>
    </>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default Header;
