// src/pages/EnergyPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
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

function EnergyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Estado real del Store (WebSockets)
  const battery = useRobotStore((state) => state.battery);
  const isCharging = battery?.status === "CHARGING";

  const [chartData, setChartData] = useState([]);
  const [currentSolarInput, setCurrentSolarInput] = useState(0);

  useEffect(() => {
    const fetchEnergyHistory = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/api/robot/energia/historial",
        );

        // Mapeo de datos reales de la BD para Recharts
        const mappedData = response.data.map((item) => {
          const date = new Date(item.timestamp);
          return {
            time: date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            rawDate: date,
            batteryLevel: Number(item.bateria_porcentaje),
            solarWatts: Number(item.radiacion_solar),
            status: item.estado,
          };
        });

        // Filtrar solo las últimas 24h para no saturar la gráfica
        const now = new Date();
        const last24h = mappedData.filter(
          (d) => now - d.rawDate <= 24 * 3600 * 1000,
        );

        setChartData(last24h);

        // Conectar el KPI de Entrada Solar al último dato registrado de la BD
        if (mappedData.length > 0) {
          const lastPoint = mappedData[mappedData.length - 1];
          setCurrentSolarInput(lastPoint.solarWatts.toFixed(0));
        }
      } catch (error) {
        console.error("Error cargando historial de energía:", error);
      }
    };

    fetchEnergyHistory();
    const interval = setInterval(fetchEnergyHistory, 15000); // Refresco cada 15s
    return () => clearInterval(interval);
  }, []);

  // Simulación de potencia basada en el voltaje real
  const currentAmps = (
    battery?.voltage > 0 ? 120 / battery.voltage : 0
  ).toFixed(1);

  return (
    <div className="energy-page-container">
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

      <div className="energy-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-icon">🔋</span>
          <span className="kpi-label">{t("energy.currentCharge")}</span>
          <span
            className={`kpi-value ${battery?.percentage < 20 ? "status-draining" : ""}`}
          >
            {battery?.percentage || 0}%
          </span>
          <span className="kpi-sub">
            {isCharging ? t("energy.charging") : t("energy.inUse")}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">⚡</span>
          <span className="kpi-label">{t("battery.voltage")} / Corriente</span>
          <span className="kpi-value">{battery?.voltage || 12.5}V</span>
          <span className="kpi-sub">~{currentAmps} Amperios</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">☀️</span>
          <span className="kpi-label">Entrada Solar</span>
          <span className={`kpi-value ${isCharging ? "status-charging" : ""}`}>
            {currentSolarInput} W/m²
          </span>
          <span className="kpi-sub">
            {currentSolarInput > 100 ? "Panel Activo" : "Standby / Noche"}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">🌡️</span>
          <span className="kpi-label">{t("battery.temperature")}</span>
          <span className="kpi-value">{battery?.temperature || 35}°C</span>
          <span className="kpi-sub">
            {t("battery.health")}: {battery?.health || 100}%
          </span>
        </div>
      </div>

      <div className="energy-charts-section">
        <h3 className="section-title">Balance Energético (24h)</h3>
        <ResponsiveContainer width="100%" height="100%">
          {chartData.length > 0 ? (
            <AreaChart
              data={chartData}
              /* 🛡️ FIX: Márgenes de Recharts reducidos al mínimo para aprovechar el ancho */
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{
                  fill: "var(--text-main)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
                tickMargin={10}
                minTickGap={40}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{
                  fill: "var(--text-main)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fill: "var(--text-main)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                opacity={0.15}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-light)",
                  color: "var(--text-main)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "15px" }} />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="batteryLevel"
                name={t("battery.level") + " (%)"}
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBat)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="solarWatts"
                name="Input Solar (W/m²)"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSolar)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          ) : (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                fontSize: "1.2em",
                color: "#64748b",
              }}
            >
              Sincronizando telemetría en tiempo real...
            </div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default EnergyPage;
