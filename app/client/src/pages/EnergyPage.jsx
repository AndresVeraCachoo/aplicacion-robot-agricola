// src/pages/EnergyPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import httpClient from "../config/httpClient";
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
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useRobotStore } from "../store/robotStore";
import { useMissionStore } from "../store/missionStore";
import { DateRangePicker } from "../components/DateRangePicker";
import "./EnergyPage.css";


/**
 * Componente de la página de energía.
 * Muestra el historial y estado actual de la batería, carga solar y consumos del robot en tiempo real.
 * @returns {JSX.Element}
 */
function EnergyPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Estado real del Store (WebSockets)
  const battery = useRobotStore((state) => state.battery);
  const isCharging = battery?.status === "CHARGING";

  // Obtenemos las misiones para rellenar el desplegable
  const { missions, fetchMissions } = useMissionStore();

  const [chartData, setChartData] = useState([]);
  const [currentSolarInput, setCurrentSolarInput] = useState(0);
  const [dateFilter, setDateFilter] = useState({
    start: null,
    end: null,
    misionId: null,
  });
  const [isFiltering, setIsFiltering] = useState(false);

  /**
   * Obtiene el historial de energía desde la API para pintar la gráfica.
   * Aplica los filtros de fechas y misión seleccionados.
   */
  const fetchEnergyHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.start) params.append("start", dateFilter.start);
      if (dateFilter.end) params.append("end", dateFilter.end);
      if (dateFilter.misionId) params.append("misionId", dateFilter.misionId);

      const response = await httpClient.get(
        `/robot/energia/historial?${params.toString()}`,
      );

      // 🛡️ Prevenimos que datos nulos rompan la gráfica (NaN)
      const mappedData = response.data.map((item) => ({
        timeMs: new Date(item.timestamp).getTime(),
        batteryLevel: Number(item.batteryPercentage) || 0,
        solarWatts: Number(item.solarRadiation) || 0,
        temperature: Number(item.temperature) || 0,
      }));

      // Aseguramos orden cronológico para evitar cruces en la línea
      mappedData.sort((a, b) => a.timeMs - b.timeMs);

      // Si no hay filtro, mostramos solo las últimas 24h
      if (!dateFilter.start && !dateFilter.misionId) {
        const now = new Date();
        setChartData(
          mappedData.filter((d) => now - d.timeMs <= 24 * 3600 * 1000),
        );
      } else {
        setChartData(mappedData);
      }

      if (mappedData.length > 0) {
        setCurrentSolarInput(
          mappedData[mappedData.length - 1].solarWatts.toFixed(0),
        );
      } else {
        setCurrentSolarInput(0);
      }
    } catch (error) {
      console.error("Error al cargar la energía:", error);
    } finally {
      setIsFiltering(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  useEffect(() => {
    setIsFiltering(true);
    fetchEnergyHistory();
    // Auto-refresco de 15s solo si NO hay filtros activos
    if (!dateFilter.start && !dateFilter.misionId) {
      const interval = setInterval(fetchEnergyHistory, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchEnergyHistory, dateFilter.start, dateFilter.misionId]);

  const handleFilter = (start, end, misionId) => {
    setDateFilter({ start, end, misionId });
  };

  // Adapta el idioma de las fechas en la gráfica
  const currentLocale = i18n.language.startsWith("en") ? enUS : es;
  const formatXAxis = (tickItem) =>
    format(new Date(tickItem), "dd/MM HH:mm", { locale: currentLocale });

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
        <h1>{t("energy.title", "Gestión de Energía")}</h1>
      </header>

      {/* KPIs Superiores (Siempre muestran tiempo real) */}
      <div className="energy-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-icon">🔋</span>
          <span className="kpi-label">
            {t("energy.currentCharge", "Carga Actual")}
          </span>
          <span
            className={`kpi-value ${battery?.percentage < 20 ? "status-draining" : ""}`}
          >
            {battery?.percentage || 0}%
          </span>
          <span className="kpi-sub">
            {isCharging
              ? t("energy.charging", "Cargando")
              : t("energy.inUse", "En Uso")}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">⚡</span>
          <span className="kpi-label">
            {t("battery.voltage", "Voltaje")} /{" "}
            {t("battery.current", "Corriente")}
          </span>
          <span className="kpi-value">{battery?.voltage || 12.5}V</span>
          <span className="kpi-sub">~{currentAmps} A</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">☀️</span>
          <span className="kpi-label">
            {t("energy.solarInput", "Entrada Solar")}
          </span>
          <span className={`kpi-value ${isCharging ? "status-charging" : ""}`}>
            {currentSolarInput} W/m²
          </span>
          <span className="kpi-sub">
            {currentSolarInput > 100
              ? t("energy.panelActive", "Panel Activo")
              : t("energy.standby", "Standby / Noche")}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">🌡️</span>
          <span className="kpi-label">
            {t("battery.temperature", "Temperatura")}
          </span>
          <span className="kpi-value">{battery?.temperature || 35}°C</span>
          <span className="kpi-sub">
            {t("battery.health", "Salud")}: {battery?.health || 100}%
          </span>
        </div>
      </div>

      <div className="energy-charts-section">
        <div className="charts-section-header">
          <h3 className="section-title">
            {dateFilter.start || dateFilter.misionId
              ? t("energy.balance", "Balance Energético")
              : t("energy.balance24h", "Balance Energético (24h)")}
          </h3>
          <DateRangePicker onFilter={handleFilter} missions={missions} />
        </div>

        {isFiltering ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            {t("energy.fetchingData", "Buscando telemetría... ⏳")}
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.length > 0 ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 0, left: -20, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#22c55e"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={formatXAxis}
                    tick={{
                      fill: "var(--text-main)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    tickMargin={10}
                    minTickGap={50}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{
                      fill: "var(--text-main)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{
                      fill: "var(--text-main)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    opacity={0.15}
                  />
                  <Tooltip
                    labelFormatter={(label) =>
                      format(new Date(label), "PPpp", { locale: currentLocale })
                    }
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
                    name={t("battery.level", "Nivel de Batería") + " (%)"}
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
                    name={t("energy.solarInput", "Entrada Solar") + " (W/m²)"}
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
                  {t(
                    "energy.noData",
                    "No se encontraron registros de energía para este filtro.",
                  )}
                </div>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnergyPage;
