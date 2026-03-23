// src/features/control/ControlPanel.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../../store/robotStore";
import "./ControlPanel.css";

const ControlPanel = () => {
  const { t } = useTranslation();
  const { system, toggleEmergencyStop, setSpeedLimit, setControlMode } =
    useRobotStore();

  return (
    <div className="control-panel-horizontal">
      <div className="panel-col">
        <h4>{t("control.drivingMode")}</h4>
        <div className="mode-buttons">
          <button
            className={system.mode === "AUTO" ? "mode-btn active" : "mode-btn"}
            onClick={() => setControlMode("AUTO")}
            disabled={system.emergencyStop}
          >
            {t("control.auto")}
          </button>
          <button
            className={
              system.mode === "MANUAL" ? "mode-btn active" : "mode-btn"
            }
            onClick={() => setControlMode("MANUAL")}
            disabled={system.emergencyStop}
          >
            {t("control.manual")}
          </button>
        </div>
      </div>

      <div className="panel-col">
        <h4>
          {t("control.speedLimit")}: {system.speedLimit}%
        </h4>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={system.speedLimit}
          disabled={system.emergencyStop}
          onChange={(e) => setSpeedLimit(Number.parseInt(e.target.value))}
          className={`speed-slider ${system.speedLimit > 80 ? "high-speed" : ""}`}
        />
      </div>

      <div className="panel-col safety-col">
        <button
          className={`alert-btn ${system.emergencyStop ? "active" : ""}`}
          onClick={toggleEmergencyStop}
        >
          {system.emergencyStop
            ? "⚠️ SISTEMA DETENIDO"
            : "🛑 PARADA DE EMERGENCIA"}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
