// src/pages/EnergyPage.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Integración de idioma
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRobotStore } from "../store/robotStore";
import "./EnergyPage.css";

const getSecureRandom = () => {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
};

// Función auxiliar para simular historial detallado de energía
const generateEnergyHistory = () => {
  const data = [];
  const now = new Date();
  let level = 80;
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600 * 1000); // Últimas 24h

    // Simulación: De día (6-18) carga solar, de noche descarga
    const hour = time.getHours();
    const isDay = hour > 6 && hour < 19;

    // Consumo base del robot
    const consumption = getSecureRandom() * 5 + 2;
    // Producción solar (0 de noche, alta a mediodía)
    const solarInput = isDay
      ? Math.max(0, 15 - Math.abs(12 - hour) * 2) + getSecureRandom() * 2
      : 0;

    level = Math.max(0, Math.min(100, level - consumption + solarInput));

    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      batteryLevel: Number(level.toFixed(1)),
      solarWatts: Number((solarInput * 12).toFixed(1)), // Conversión ficticia a Watts
      consumptionWatts: Number((consumption * 12).toFixed(1)),
    });
  }
  return data;
};

function EnergyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const battery = useRobotStore((state) => state.battery);
  const isCharging = battery.status === "CHARGING";

  // Generamos datos al montar el componente (simulación)
  const chartData = useMemo(() => generateEnergyHistory(), []);

  // Cálculos derivados para KPIs
  const currentSolarInput = isCharging
    ? (getSecureRandom() * 50 + 100).toFixed(0)
    : 0;
  const currentAmps = (battery.voltage > 0 ? 120 / battery.voltage : 0).toFixed(
    1,
  ); // Simulación potencia

  return (
    <div className="energy-page-container">
      {/* Cabecera */}
      <header className="energy-header">
        <button
          onClick={() => navigate("/app/dashboard")}
          className="btn-back"
          title={t("dashboard.title")}
        >
          ←
        </button>
        <h1>{t("energy.title")}</h1>
      </header>

      {/* Grid de KPIs */}
      <div className="energy-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-icon">🔋</span>
          <span className="kpi-label">{t("energy.currentCharge")}</span>
          <span
            className={`kpi-value ${
              battery.percentage < 20 ? "status-draining" : ""
            }`}
          >
            {battery.percentage}%
          </span>
          <span className="kpi-sub">
            {isCharging ? t("energy.charging") : t("energy.inUse")}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">⚡</span>
          <span className="kpi-label">{t("battery.voltage")} / Corriente</span>
          <span className="kpi-value">{battery.voltage}V</span>
          <span className="kpi-sub">~{currentAmps} Amperios</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">☀️</span>
          <span className="kpi-label">Entrada Solar</span>
          <span className={`kpi-value ${isCharging ? "status-charging" : ""}`}>
            {currentSolarInput} W
          </span>
          <span className="kpi-sub">
            {isCharging ? "Panel Activo" : "Standby / Noche"}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">🌡️</span>
          <span className="kpi-label">{t("battery.temperature")}</span>
          <span className="kpi-value">{battery.temperature}°C</span>
          <span className="kpi-sub">
            {t("battery.health")}: {battery.health}%
          </span>
        </div>
      </div>

      {/* Gráfica Avanzada */}
      <div className="energy-charts-section">
        <h3 className="section-title">Balance Energético (24h)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "var(--text-main)" }} />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fill: "var(--text-main)" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "var(--text-main)" }}
            />
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-light)",
                color: "var(--text-main)",
              }}
            />
            <Legend />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="batteryLevel"
              name={t("battery.level") + " (%)"}
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorBat)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="solarWatts"
              name="Input Solar (W)"
              stroke="#f59e0b"
              fillOpacity={1}
              fill="url(#colorSolar)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default EnergyPage;
