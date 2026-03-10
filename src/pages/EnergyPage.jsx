// src/pages/EnergyPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./EnergyPage.css";
import { useRobotStore } from "../store/robotStore";

function EnergyPage() {
  const { t } = useTranslation();
  const battery = useRobotStore((state) => state.battery);
  const { percentage, status, voltage, temperature, health } = battery;

  // Clases dinámicas según el porcentaje
  const getBatteryClass = () => {
    if (status === "CHARGING") return "charging";
    if (percentage < 20) return "critical";
    if (percentage < 50) return "low";
    return "good";
  };

  return (
    <div className="energy-page-container">
      <div className="energy-header">
        <h1>{t("energy.title")}</h1>
        <p>{t("energy.subtitle")}</p>
      </div>

      <div className="energy-dashboard-grid">
        {/* PANEL PRINCIPAL: Estado de la batería */}
        <div className="energy-card main-battery-card">
          <h2>{t("energy.batteryStatus")}</h2>
          <div className="battery-visualizer">
            <div className={`battery-icon-large ${getBatteryClass()}`}>
              <div
                className="battery-level-fill"
                style={{ height: `${percentage}%` }}
              ></div>
            </div>
            <div className="battery-info-large">
              <span className="battery-percentage-text">{percentage}%</span>
              <span className={`battery-status-badge ${getBatteryClass()}`}>
                {status === "CHARGING"
                  ? t("energy.charging")
                  : t("energy.inUse")}
              </span>
            </div>
          </div>
        </div>

        {/* PANELES SECUNDARIOS: Estadísticas */}
        <div className="energy-stats-container">
          <div className="energy-stat-card">
            <h3>{t("energy.currentCharge")}</h3>
            <p className="stat-value">{voltage} V</p>
          </div>
          <div className="energy-stat-card">
            <h3>{t("energy.generalStatus")}</h3>
            <p className="stat-value">{status}</p>
          </div>
          <div className="energy-stat-card">
            <h3>{t("energy.health")}</h3>
            <p className="stat-value health-good">{health}%</p>
          </div>
          <div className="energy-stat-card">
            <h3>{t("energy.temperature")}</h3>
            <p className="stat-value">{temperature} °C</p>
          </div>
          <div className="energy-stat-card">
            <h3>{t("energy.chargeCycles")}</h3>
            <p className="stat-value">142</p>
          </div>
        </div>

        {/* PANEL INFERIOR: Consumo estimado */}
        <div className="energy-card consumption-card">
          <h2>{t("energy.realTimeConsumption")}</h2>
          <div className="consumption-bars">
            <div className="consumption-item">
              <span>{t("energy.tractionMotors")} (60%)</span>
              <div className="bar-bg">
                <div className="bar-fill motors" style={{ width: "60%" }}></div>
              </div>
            </div>
            <div className="consumption-item">
              <span>{t("energy.navSystem")} (25%)</span>
              <div className="bar-bg">
                <div className="bar-fill nav" style={{ width: "25%" }}></div>
              </div>
            </div>
            <div className="consumption-item">
              <span>{t("energy.sensorsCamera")} (15%)</span>
              <div className="bar-bg">
                <div
                  className="bar-fill sensors"
                  style={{ width: "15%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnergyPage;
