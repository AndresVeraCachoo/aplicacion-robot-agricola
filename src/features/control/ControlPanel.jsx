// src/features/control/ControlPanel.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../../store/robotStore";
import "./ControlPanel.css";

const ControlPanel = () => {
  const { t } = useTranslation();
  const {
    system,
    setSpeedLimit,
    setControlMode,
    safeZone,
    togglePauseMission,
    cancelMission,
  } = useRobotStore();

  const isPaused = system.status === "PAUSED";
  const hasActiveArea = safeZone !== null && safeZone.length > 0;

  return (
    <div className="control-panel-horizontal">
      <div className="panel-col">
        <h4>{t("control.drivingMode")}</h4>
        <div className="mode-buttons">
          <button
            className={system.mode === "AUTO" ? "mode-btn active" : "mode-btn"}
            onClick={() => setControlMode("AUTO")}
          >
            {t("control.auto")}
          </button>
          <button
            className={
              system.mode === "MANUAL" ? "mode-btn active" : "mode-btn"
            }
            onClick={() => setControlMode("MANUAL")}
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
          onChange={(e) => setSpeedLimit(Number.parseInt(e.target.value))}
          className={`speed-slider ${system.speedLimit > 80 ? "high-speed" : ""}`}
        />
      </div>

      {/* Columna de control de la misión: Siempre visible */}
      <div className="panel-col mission-col">
        <h4>Control de Misión</h4>
        <div className="mission-actions">
          {/* PAUSAR/REANUDAR siempre visible */}
          <button
            className={`mission-btn ${isPaused ? "btn-resume" : "btn-pause"}`}
            onClick={togglePauseMission}
          >
            {isPaused ? "▶ REANUDAR" : "⏸ PAUSAR"}
          </button>

          {/* CANCELAR solo visible si hay área */}
          {hasActiveArea && (
            <button className="mission-btn btn-cancel" onClick={cancelMission}>
              ⏹ CANCELAR MISIÓN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
