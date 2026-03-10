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
      {/* 1. Modos de Conducción */}
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

      {/* 2. Control de Velocidad */}
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

      {/* 3. Parada de Emergencia */}
      <div className="panel-col safety-col">
        <button
          className={`estop-btn ${system.emergencyStop ? "active" : ""}`}
          onClick={toggleEmergencyStop}
        >
          {system.emergencyStop
            ? t("control.rearmSystem")
            : t("control.emergencyStop")}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
