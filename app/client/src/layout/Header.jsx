// src/layout/Header.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./Header.css";
import { useRobotStore } from "../store/robotStore.js";
import { useToastStore } from "../store/toastStore.js";
import { useThemeStore } from "../store/themeStore.js";
import Modal from "../components/Modal.jsx";
import BatteryModal from "../features/dashboard/components/BatteryModal.jsx";
import SupportModal from "../features/support/components/SupportModal";

const LANGUAGES = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
];

/**
 * Componente Header del dashboard.
 * Muestra el estado de conexión, idioma, tema, y widgets de batería.
 * @param {Object} props - Propiedades del componente.
 * @param {Function} props.onMenuClick - Función para abrir/cerrar el menú lateral.
 * @returns {JSX.Element}
 */
function Header({ onMenuClick }) {
  const { t, i18n } = useTranslation();
  const battery = useRobotStore((state) => state.battery);
  const isConnected = useRobotStore((state) => state.isConnected);
  const { addToast } = useToastStore();

  const { percentage, status, netPower = 0 } = battery;
  const { isDarkMode, toggleTheme } = useThemeStore();
  
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const openBatteryModal = () => setIsBatteryModalOpen(true);
  const closeBatteryModal = () => setIsBatteryModalOpen(false);

  const isPluggedIn = status === "CHARGING";
  const isSolarGaining = !isPluggedIn && netPower > 0 && percentage < 100;

  const getBatteryClass = () => {
    if (isPluggedIn) return "charging";
    if (isSolarGaining) return "solar";
    if (percentage < 10) return "critical";
    if (percentage <= 50) return "low";
    return "good";
  };

  const currentLang = LANGUAGES.find(l => (i18n.resolvedLanguage || i18n.language || "es").startsWith(l.code)) || LANGUAGES[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode).then(() => {
      addToast(i18n.getFixedT(langCode)("notifications.languageChanged"), "info");
      setIsLangMenuOpen(false);
    });
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button onClick={onMenuClick} className="menu-button" aria-label={t("sidebar.menu")}>
            ☰
          </button>
          <div className={`system-status-pill ${isConnected ? "online" : "offline"}`} title={isConnected ? t("header.connected") : t("header.disconnected")}>
            <span className="status-dot"></span>
            <span className="status-text">{isConnected ? t("header.online") : t("header.offline")}</span>
          </div>
        </div>

        <div className="header-right-controls">
          
          {/* Selector de Idioma Compacto */}
          <div className="header-lang-container">
            <button 
              className={`header-lang-btn ${isLangMenuOpen ? "active" : ""}`} 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            >
              <span>{currentLang.label}</span>
              <span className={`lang-arrow ${isLangMenuOpen ? "up" : ""}`}>▾</span>
            </button>
            
            {isLangMenuOpen && (
              <div className="header-lang-dropdown">
                {LANGUAGES.filter(l => l.code !== currentLang.code).map(lang => (
                  <button 
                    key={lang.code}
                    className="header-lang-option"
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="theme-toggle-btn" onClick={toggleTheme} title={isDarkMode ? t("header.lightMode") : t("header.darkMode")}>
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <button className="theme-toggle-btn" onClick={() => setIsSupportOpen(true)} title={t("sidebar.support", "Soporte Técnico")}>
            🎧
          </button>

          <button className={`battery-widget clickable ${getBatteryClass()}`} onClick={openBatteryModal} title={`${t("header.battery")}: ${percentage}%`}>
            <span className="battery-text">
              {isPluggedIn && <span className="charging-bolt">⚡</span>}
              {isSolarGaining && <span className="solar-icon">🌤️</span>}
              {percentage}%
            </span>
            <div className="battery-icon">
              <div className="battery-fill" style={{ width: `${percentage}%` }}></div>
            </div>
          </button>
        </div>
      </header>

      <Modal isOpen={isBatteryModalOpen} onClose={closeBatteryModal} title={t("header.energyDetail")}>
        <BatteryModal onClose={closeBatteryModal} />
      </Modal>

      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
      />
    </>
  );
}

Header.propTypes = { onMenuClick: PropTypes.func.isRequired };
export default Header;