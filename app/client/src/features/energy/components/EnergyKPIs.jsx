// src/features/energy/components/EnergyKPIs.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Componente que muestra las tarjetas (KPIs) con los indicadores clave de energía en tiempo real.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.battery - Estado actual de la batería.
 * @param {boolean} props.isCharging - Indica si la batería se está cargando.
 * @param {number|string} props.currentSolarInput - Entrada actual de energía solar en W/m².
 * @param {string} props.currentAmps - Corriente calculada actual.
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} El grid de KPIs de energía.
 */
function EnergyKPIs({ battery, isCharging, currentSolarInput, currentAmps, t }) {
  return (
    <div className="energy-kpi-grid">
      <div className="kpi-card">
        <span className="kpi-icon">🔋</span>
        <span className="kpi-label">
          {t("energy.currentCharge", "Carga Actual")}
        </span>
        <span
          className={`kpi-value ${battery?.percentage < 20 ? "status-draining" : ""}`}
        >
          {battery?.percentage || 0}%
        </span>
        <span className="kpi-sub">
          {isCharging
            ? t("energy.charging", "Cargando")
            : t("energy.inUse", "En Uso")}
        </span>
      </div>

      <div className="kpi-card">
        <span className="kpi-icon">⚡</span>
        <span className="kpi-label">
          {t("battery.voltage", "Voltaje")} /{" "}
          {t("battery.current", "Corriente")}
        </span>
        <span className="kpi-value">{battery?.voltage || 12.5}V</span>
        <span className="kpi-sub">~{currentAmps} A</span>
      </div>

      <div className="kpi-card">
        <span className="kpi-icon">☀️</span>
        <span className="kpi-label">
          {t("energy.solarInput", "Entrada Solar")}
        </span>
        <span className={`kpi-value ${isCharging ? "status-charging" : ""}`}>
          {currentSolarInput} W/m²
        </span>
        <span className="kpi-sub">
          {Number(currentSolarInput) > 100
            ? t("energy.panelActive", "Panel Activo")
            : t("energy.standby", "Standby / Noche")}
        </span>
      </div>

      <div className="kpi-card">
        <span className="kpi-icon">🌡️</span>
        <span className="kpi-label">
          {t("battery.temperature", "Temperatura")}
        </span>
        <span className="kpi-value">{battery?.temperature || 35}°C</span>
        <span className="kpi-sub">
          {t("battery.health", "Salud")}: {battery?.health || 100}%
        </span>
      </div>
    </div>
  );
}

EnergyKPIs.propTypes = {
  battery: PropTypes.object,
  isCharging: PropTypes.bool.isRequired,
  currentSolarInput: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currentAmps: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

export default EnergyKPIs;
