// src/features/dashboard/components/BatteryModal.jsx
import React from "react";
import { useRobotStore } from "../../../store/robotStore";
import "./BatteryModal.css";

function BatteryModal() {
  const batteryInfo = useRobotStore((state) => state.battery);

  let statusIcon = "🔋";
  let statusText = "Descargando";
  if (batteryInfo.status === "CHARGING") {
    statusIcon = "🔌☀️";
    statusText = "Cargando (Solar)";
  } else if (batteryInfo.status === "IDLE") {
    statusIcon = "⏳";
    statusText = "Inactivo";
  }

  return (
    <div className="battery-modal-content">
      <div className="battery-status-row">
        <span className="battery-icon-large">{statusIcon}</span>
        <span className="battery-percentage-large">
          {batteryInfo.percentage}%
        </span>
      </div>
      <div className="battery-details">
        <p>
          <strong>Estado:</strong> {statusText}
        </p>
        <p>
          <strong>Voltaje:</strong> {batteryInfo.voltage} V
        </p>
        <p>
          <strong>Temperatura:</strong> {batteryInfo.temperature} °C
        </p>
        <p>
          <strong>Tiempo Restante Estimado:</strong> {batteryInfo.timeRemaining}
        </p>
      </div>
    </div>
  );
}

export default BatteryModal;
