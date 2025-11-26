// src/features/dashboard/components/BatteryModal.jsx
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useRobotStore } from "../../../store/robotStore";
import "./BatteryModal.css";

// --- Generador de Datos Simulados (Estabilizado) ---
const generateMockBatteryHistory = (currentLevel, isCharging) => {
  const data = [];
  const now = new Date();

  let simulatedLevel = currentLevel;

  // Generamos 24 horas hacia atrás
  for (let i = 0; i < 24; i++) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);

    // Lógica de Estado Pasado:
    // Si está cargando AHORA, asumimos que lleva cargando entre 1 y 4 horas.
    // Antes de eso, asumimos que se estaba descargando.
    let wasChargingInPast = isCharging;

    // Si actualmente carga, fingimos que empezó hace poco (ej. 3 horas)
    if (isCharging && i > 3) {
      wasChargingInPast = false;
    }

    // Si actualmente NO carga, fingimos que lleva así un buen rato,
    // a menos que esté al 100%, lo que implicaría que acabó de cargar hace poco.
    if (!isCharging && currentLevel === 100 && i < 5) {
      wasChargingInPast = true;
    }

    // Cálculo del nivel (hacia el pasado, invertimos la lógica)
    if (i > 0) {
      const rate = Math.random() * 4 + 3; // Variación 3-7%

      if (wasChargingInPast) {
        // Si en ese momento cargaba, tenía MENOS batería que el futuro relativo.
        // Restamos al ir hacia atrás.
        simulatedLevel = Math.max(0, simulatedLevel - rate * 2); // Carga rápida
      } else {
        // Si en ese momento gastaba, tenía MÁS batería.
        // Sumamos al ir hacia atrás.
        simulatedLevel = Math.min(100, simulatedLevel + rate);
      }
    }

    data.unshift({
      hour: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      level: Math.round(simulatedLevel),
      isChargingState: wasChargingInPast,
    });
  }

  // Forzar consistencia final
  data[data.length - 1].level = currentLevel;
  data[data.length - 1].isChargingState = isCharging;

  return data;
};

function BatteryModal() {
  const batteryInfo = useRobotStore((state) => state.battery);
  const { percentage, status, voltage, temperature, timeRemaining } =
    batteryInfo;
  const isCharging = status === "CHARGING";

  const LOW_BATTERY_THRESHOLD = 20;

  const historyData = useMemo(() => {
    return generateMockBatteryHistory(percentage, isCharging);
  }, [percentage, isCharging]);

  let statusIcon = "🔋";
  let statusText = "En uso";
  if (isCharging) {
    statusIcon = "⚡";
    statusText = "Cargando (Solar)";
  } else if (percentage < LOW_BATTERY_THRESHOLD) {
    statusIcon = "🪫";
    statusText = "Batería Baja";
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="battery-tooltip">
          <p className="tooltip-time">{label}</p>
          <p className="tooltip-level">
            {dataPoint.level}% {dataPoint.isChargingState ? "⚡" : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  // Función de color corregida y simplificada
  const getBarColor = (entry) => {
    // 1. Si está cargando -> VERDE (siempre)
    if (entry.isChargingState) return "#22c55e";

    // 2. Si no carga y es bajo -> NARANJA
    if (entry.level < LOW_BATTERY_THRESHOLD) return "#f97316";

    // 3. Si no carga y es normal -> AZUL
    return "#3b82f6";
  };

  return (
    <div className="battery-modal-content">
      {/* Header */}
      <div className="battery-header-section">
        <div className="battery-percentage-ring">
          <span className="icon">{statusIcon}</span>
          <span
            className={`value ${
              percentage < LOW_BATTERY_THRESHOLD ? "text-alert" : ""
            }`}
          >
            {percentage}%
          </span>
        </div>

        <div className="battery-info-grid">
          <div className="info-item">
            <span className="label">Estado</span>
            <span className={`value ${isCharging ? "charging-text" : ""}`}>
              {statusText}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Tiempo Restante</span>
            <span className="value">{timeRemaining}</span>
          </div>
          <div className="info-item">
            <span className="label">Voltaje</span>
            <span className="value">{voltage} V</span>
          </div>
          <div className="info-item">
            <span className="label">Temperatura</span>
            <span className="value">{temperature}°C</span>
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Gráfica */}
      <div className="battery-chart-section">
        <div className="chart-header-row">
          <h4>Uso de batería (24h)</h4>
          <button
            className="btn-details-link"
            onClick={() => alert("Próximamente")}
          >
            Más detalles &rarr;
          </button>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} barCategoryGap={2}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--text-main)" }}
                minTickGap={35}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
              />

              {/* Línea de referencia (Umbral) */}
              <ReferenceLine
                y={LOW_BATTERY_THRESHOLD}
                stroke="#ef4444"
                strokeDasharray="3 3"
              />

              <Bar dataKey="level" radius={[3, 3, 3, 3]}>
                {historyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry)}
                    fillOpacity={entry.isChargingState ? 1 : 0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* LEYENDA ACTUALIZADA CON CUADRADO NARANJA */}
        <div className="chart-legend">
          <span className="legend-item">
            <span className="dot usage"></span> Uso
          </span>
          <span className="legend-item">
            <span className="dot charge"></span> Carga
          </span>
          <span className="legend-item">
            <span className="dot low"></span> Bajo ({"<"}20%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default BatteryModal;
