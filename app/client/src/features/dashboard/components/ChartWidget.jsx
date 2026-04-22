// src/features/dashboard/components/ChartWidget.jsx
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./ChartWidget.css";

// SOLUCIÓN SONARLINT: Componente declarado FUERA del componente principal
const MetricOptions = ({ t }) => (
  <>
    <optgroup label={t("chart.climateSoil")}>
      <option value="humedad">{t("chart.humidity")}</option>
      <option value="temperatura_suelo">{t("chart.temp")}</option>
      <option value="ph">{t("chart.ph")}</option>
      <option value="radiacion_solar">{t("chart.solarRad")}</option>
    </optgroup>
    <optgroup label={t("chart.nutrients")}>
      <option value="nitrogeno">{t("chart.nitrogen")}</option>
      <option value="fosforo">{t("chart.phosphorus")}</option>
      <option value="potasio">{t("chart.potassium")}</option>
    </optgroup>
  </>
);

MetricOptions.propTypes = {
  t: PropTypes.func.isRequired,
};

function ChartWidget({
  data,
  title = "Análisis de Datos",
  initialType = "area",
  initialMetric1 = "humedad",
  initialMetric2 = "temperatura_suelo",
  forcedCompare = false,
}) {
  const { t } = useTranslation();
  const [metric1, setMetric1] = useState(initialMetric1);
  const [metric2, setMetric2] = useState(initialMetric2);
  const [chartType, setChartType] = useState(initialType);
  const [timeRange, setTimeRange] = useState("all");

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    let processedData = [...data].reverse();

    if (timeRange !== "all") {
      const cutoff = new Date();
      if (timeRange === "1h") cutoff.setHours(now.getHours() - 1);
      if (timeRange === "24h") cutoff.setHours(now.getHours() - 24);
      if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);

      processedData = processedData.filter(
        (d) => new Date(d.timestamp) >= cutoff,
      );
    }

    return processedData.map((d) => ({
      ...d,
      timeStr: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      humedad: Number(d.humedad),
      temperatura_suelo: Number(d.temperatura_suelo),
      ph: Number(d.ph),
      nitrogeno: Number(d.nitrogeno),
      fosforo: Number(d.fosforo),
      potasio: Number(d.potasio),
      radiacion_solar: Number(d.radiacion_solar),
    }));
  }, [data, timeRange]);

  const config = {
    humedad: {
      color: "#3b82f6",
      label: t("chart.humidityLabel"),
      domain: [0, 100],
    },
    temperatura_suelo: {
      color: "#f97316",
      label: t("chart.tempLabel"),
      domain: ["auto", "auto"],
    },
    ph: { color: "#10b981", label: t("chart.phLabel"), domain: [0, 14] },
    nitrogeno: {
      color: "#0ea5e9",
      label: t("chart.nitrogenLabel"),
      domain: [0, "auto"],
    },
    fosforo: {
      color: "#eab308",
      label: t("chart.phosphorusLabel"),
      domain: [0, "auto"],
    },
    potasio: {
      color: "#8b5cf6",
      label: t("chart.potassiumLabel"),
      domain: [0, "auto"],
    },
    radiacion_solar: {
      color: "#ef4444",
      label: t("chart.solarRadLabel"),
      domain: [0, "auto"],
    },
  };

  const conf1 = config[metric1] || config["humedad"];
  const conf2 = config[metric2] || config["temperatura_suelo"];

  const isComparing = forcedCompare || chartType === "compare";

  const CommonAxis = (
    <>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
      <XAxis
        dataKey="timeStr"
        tick={{ fontSize: 10, fill: "var(--text-main)" }}
        minTickGap={30}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        yAxisId="left"
        domain={conf1.domain}
        tick={{ fontSize: 11, fill: conf1.color }}
        axisLine={false}
        tickLine={false}
        width={35}
        orientation="left"
      />
      {isComparing && (
        <YAxis
          yAxisId="right"
          domain={conf2.domain}
          tick={{ fontSize: 11, fill: conf2.color }}
          axisLine={false}
          tickLine={false}
          width={35}
          orientation="right"
        />
      )}
      <Tooltip
        contentStyle={{
          backgroundColor: "var(--card-bg, #fff)",
          borderColor: "var(--border-light, #ccc)",
          borderRadius: "8px",
          color: "var(--text-main)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      />
      <Legend wrapperStyle={{ paddingTop: "10px" }} />
    </>
  );

  const renderChart = () => {
    if (chartData.length === 0)
      return <div className="no-data-chart">{t("chart.noData")}</div>;

    if (isComparing) {
      return (
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          {CommonAxis}
          <defs>
            <linearGradient id={`grad-${metric1}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={conf1.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={conf1.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            yAxisId="left"
            type="monotone"
            dataKey={metric1}
            name={conf1.label}
            stroke={conf1.color}
            fillOpacity={1}
            fill={`url(#grad-${metric1})`}
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={metric2}
            name={conf2.label}
            stroke={conf2.color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      );
    }

    if (chartType === "scatter") {
      return (
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="timeStr"
            name={t("chart.time")}
            tick={{ fontSize: 10 }}
            minTickGap={30}
          />
          <YAxis
            type="number"
            dataKey={metric1}
            name={conf1.label}
            domain={conf1.domain}
            tick={{ fontSize: 11, fill: conf1.color }}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <Scatter name={conf1.label} data={chartData} fill={conf1.color} />
        </ScatterChart>
      );
    }

    if (chartType === "bar") {
      return (
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {CommonAxis}
          <Bar
            dataKey={metric1}
            name={conf1.label}
            fill={conf1.color}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {CommonAxis}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={metric1}
            name={conf1.label}
            stroke={conf1.color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      );
    }

    return (
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient
            id={`grad-${metric1}-single`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={conf1.color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={conf1.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {CommonAxis}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey={metric1}
          name={conf1.label}
          stroke={conf1.color}
          fillOpacity={1}
          fill={`url(#grad-${metric1}-single)`}
          strokeWidth={2}
        />
      </AreaChart>
    );
  };

  return (
    <div className="chart-widget-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>

        <div className="chart-controls-row">
          <div className="control-group">
            <span className="control-label">{t("chart.range")}</span>
            <div className="time-pills">
              <button
                type="button"
                className={timeRange === "1h" ? "active" : ""}
                onClick={() => setTimeRange("1h")}
              >
                1h
              </button>
              <button
                type="button"
                className={timeRange === "24h" ? "active" : ""}
                onClick={() => setTimeRange("24h")}
              >
                24h
              </button>
              <button
                type="button"
                className={timeRange === "all" ? "active" : ""}
                onClick={() => setTimeRange("all")}
              >
                {t("chart.all")}
              </button>
            </div>
          </div>

          {!forcedCompare && (
            <div className="control-group">
              <div className="btn-group">
                <button
                  type="button"
                  className={chartType === "area" ? "active" : ""}
                  onClick={() => setChartType("area")}
                  title="Área"
                >
                  📈
                </button>
                <button
                  type="button"
                  className={chartType === "line" ? "active" : ""}
                  onClick={() => setChartType("line")}
                  title="Línea"
                >
                  〰️
                </button>
                <button
                  type="button"
                  className={chartType === "bar" ? "active" : ""}
                  onClick={() => setChartType("bar")}
                  title="Barras"
                >
                  📊
                </button>
                <button
                  type="button"
                  className={chartType === "scatter" ? "active" : ""}
                  onClick={() => setChartType("scatter")}
                  title="Dispersión"
                >
                  ∴
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="metric-selectors-row">
          <select
            value={metric1}
            onChange={(e) => setMetric1(e.target.value)}
            className="metric-select primary"
          >
            <MetricOptions t={t} />
          </select>

          {isComparing && (
            <>
              <span className="vs-badge">vs</span>
              <select
                value={metric2}
                onChange={(e) => setMetric2(e.target.value)}
                className="metric-select secondary"
              >
                <MetricOptions t={t} />
              </select>
            </>
          )}
        </div>
      </div>

      <div className="chart-responsive-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

ChartWidget.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  title: PropTypes.string,
  initialType: PropTypes.string,
  initialMetric1: PropTypes.string,
  initialMetric2: PropTypes.string,
  forcedCompare: PropTypes.bool,
};

export default ChartWidget;
