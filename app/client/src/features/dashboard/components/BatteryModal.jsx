// src/features/dashboard/components/BatteryModal.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useRobotStore } from "../../../store/robotStore";
import "./BatteryModal.css";

// Subcomponente: Tooltip Personalizado
const CustomTooltip = ({ active, payload, label }) => {
  // Solución SonarLint S6582: Optional Chaining preferido
  if (active && payload?.length) {
    return (
      <div className="battery-tooltip">
        <p className="tooltip-time">{label}</p>
        <p className="tooltip-level">{`${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

function BatteryModal({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const battery = useRobotStore((state) => state.battery);
  const isConnected = useRobotStore((state) => state.isConnected);

  const isCharging = battery.status === "CHARGING";

  const mockHistory = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }).map((_, i) => {
      const timeDate = new Date(now.getTime() - (7 - i) * 60000);
      const timeStr = timeDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const offset = (7 - i) * (isCharging ? -2 : 2);
      let level = battery.percentage + offset;
      if (level > 100) level = 100;
      if (level < 0) level = 0;

      return { time: timeStr, level };
    });
  }, [battery.percentage, isCharging]);

  const handleDetailsClick = () => {
    onClose();
    navigate("/app/energy");
  };

  // Solución SonarLint S3358: Evitar ternarios anidados para el texto
  let statusText = t("header.offline");
  if (isCharging) {
    statusText = t("battery.charging");
  } else if (isConnected) {
    statusText = t("battery.discharging");
  }

  // Solución SonarLint S3358: Evitar ternarios anidados para el color
  let strokeColor = "#3b82f6"; // Azul por defecto
  if (isCharging) {
    strokeColor = "#22c55e"; // Verde si carga
  } else if (battery.percentage <= 20) {
    strokeColor = "#f97316"; // Naranja si es bajo
  }

  return (
    <div className="battery-modal-content">
      <div className="battery-header-section">
        <div className="battery-percentage-ring">
          <span className="icon">{isCharging ? "⚡" : "🔋"}</span>
          <span
            className={`value ${battery.percentage <= 20 ? "text-alert" : ""}`}
          >
            {battery.percentage}%
          </span>
        </div>

        <div className="battery-info-grid">
          <div className="info-item">
            <span className="label">{t("battery.status")}</span>
            <span className={`value ${isCharging ? "charging-text" : ""}`}>
              {statusText}
            </span>
          </div>
          <div className="info-item">
            <span className="label">{t("battery.voltage")}</span>
            <span className="value">{battery.voltage || "0.0"} V</span>
          </div>
          <div className="info-item">
            <span className="label">{t("battery.temperature")}</span>
            <span className="value">{battery.temperature || "0.0"} °C</span>
          </div>
          <div className="info-item">
            <span className="label">{t("battery.health")}</span>
            <span className="value">{battery.health || "100"}%</span>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="battery-chart-section">
        <div className="chart-header-row">
          <h4>
            {t("chart.time")} vs {t("battery.level")}
          </h4>
          <button className="btn-details-link" onClick={handleDetailsClick}>
            {t("header.energyDetail")} →
          </button>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockHistory}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#cbd5e1"
                opacity={0.4}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="level"
                stroke={strokeColor}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: strokeColor,
                  stroke: "var(--card-bg, #fff)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <span className="dot charge"></span> {t("battery.charging")}
          </div>
          <div className="legend-item">
            <span className="dot usage"></span> {t("battery.discharging")}
          </div>
        </div>
      </div>
    </div>
  );
}

BatteryModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default BatteryModal;
