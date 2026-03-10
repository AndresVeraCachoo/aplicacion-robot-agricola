// src/features/dashboard/components/BatteryModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./BatteryModal.css";
import { useRobotStore } from "../../../store/robotStore";

function BatteryModal({ onClose }) {
  const { t } = useTranslation();
  const battery = useRobotStore((state) => state.battery);

  const getStatusClass = () => {
    if (battery.status === "CHARGING") return "status-charging";
    if (battery.percentage < 20) return "status-critical";
    return "status-normal";
  };

  return (
    <div className="battery-modal-content">
      <h3 className="battery-title">{t("battery.title")}</h3>

      <div className="battery-main-indicator">
        <div className={`battery-big-circle ${getStatusClass()}`}>
          <span className="battery-percentage">{battery.percentage}%</span>
          <span className="battery-status-text">
            {battery.status === "CHARGING"
              ? t("battery.charging")
              : t("battery.discharging")}
          </span>
        </div>
      </div>

      <div className="battery-details-grid">
        <div className="detail-item">
          <span className="detail-label">{t("battery.voltage")}</span>
          <span className="detail-value">{battery.voltage}V</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t("battery.temperature")}</span>
          <span className="detail-value">{battery.temperature}°C</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t("battery.health")}</span>
          <span className="detail-value">{battery.health}%</span>
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="btn-close-modal">
          {t("users.cancel")}{" "}
          {/* Reutilizamos el botón de cancelar que ya existe */}
        </button>
      </div>
    </div>
  );
}

BatteryModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default BatteryModal;
