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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import "./ChartWidget.css";

const MetricOptions = ({ t }) => (
  <>
    <optgroup label={t("chart.climateSoil")}>
      <option value="humidity">{t("chart.humidity")}</option>
      <option value="temperature">{t("chart.temp")}</option>
      <option value="ph">{t("chart.ph")}</option>
      <option value="radiation">{t("chart.solarRad")}</option>
    </optgroup>
    <optgroup label={t("chart.nutrients")}>
      <option value="nitrogen">{t("chart.nitrogen")}</option>
      <option value="phosphorus">{t("chart.phosphorus")}</option>
      <option value="potassium">{t("chart.potassium")}</option>
    </optgroup>
  </>
);
MetricOptions.propTypes = { t: PropTypes.func.isRequired };

/**
 * Componente interactivo para mostrar gráficos de métricas.
 * Soporta múltiples tipos de gráficos y comparación de métricas.
 * @param {Object} props - Propiedades del componente.
 * @param {Array} props.data - Datos a graficar.
 * @param {string} props.title - Título del gráfico.
 * @param {string} props.initialType - Tipo de gráfico inicial.
 * @param {string} props.initialMetric1 - Métrica 1 inicial.
 * @param {string} props.initialMetric2 - Métrica 2 inicial.
 * @param {boolean} props.forcedCompare - Si la comparación es obligatoria.
 * @returns {JSX.Element}
 */
function ChartWidget({
  data,
  title = "Análisis de Datos",
  initialType = "area",
  initialMetric1 = "humidity",
  initialMetric2 = "temperature",
  forcedCompare = false,
}) {
  const { t } = useTranslation();
  const [metric1, setMetric1] = useState(initialMetric1);
  const [metric2, setMetric2] = useState(initialMetric2);
  const [chartType, setChartType] = useState(initialType);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let processedData = [...data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    return processedData.map((d) => ({
      ...d,
      timeMs: new Date(d.timestamp).getTime(),
      humidity: d.humidity !== null && d.humidity !== undefined ? Number(d.humidity) : null,
      temperature: d.soilTemperature !== null && d.soilTemperature !== undefined ? Number(d.soilTemperature) : null,
      ph: d.ph !== null && d.ph !== undefined ? Number(d.ph) : null,
      nitrogen: d.nitrogen !== null && d.nitrogen !== undefined ? Number(d.nitrogen) : null,
      phosphorus: d.phosphorus !== null && d.phosphorus !== undefined ? Number(d.phosphorus) : null,
      potassium: d.potassium !== null && d.potassium !== undefined ? Number(d.potassium) : null,
      radiation: d.solarRadiation !== null && d.solarRadiation !== undefined ? Number(d.solarRadiation) : null,
    }));
  }, [data]);

  const config = {
    humidity: {
      color: "#3b82f6",
      label: t("chart.humidityLabel"),
      domain: [0, 100],
    },
    temperature: {
      color: "#f97316",
      label: t("chart.tempLabel"),
      domain: ["auto", "auto"],
    },
    ph: { color: "#10b981", label: t("chart.phLabel"), domain: [0, 14] },
    nitrogen: {
      color: "#3b82f6",
      label: t("chart.nitrogenLabel"),
      domain: [0, "auto"],
    },
    phosphorus: {
      color: "#eab308",
      label: t("chart.phosphorusLabel"),
      domain: [0, "auto"],
    },
    potassium: {
      color: "#a855f7",
      label: t("chart.potassiumLabel"),
      domain: [0, "auto"],
    },
    radiation: {
      color: "#ef4444",
      label: t("chart.solarRadLabel"),
      domain: [0, "auto"],
    },
  };

  const conf1 = config[metric1] || config["humidity"];
  const conf2 = config[metric2] || config["temperature"];
  const isComparing = forcedCompare || chartType === "compare";

  const formatXAxis = (tickItem) => {
    return format(new Date(tickItem), "dd/MM HH:mm", { locale: es });
  };

  const CommonAxis = (
    <>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
      <XAxis
        dataKey="timeMs"
        type="number"
        scale="time"
        domain={["dataMin", "dataMax"]}
        tickFormatter={formatXAxis}
        tick={{ fontSize: 10, fill: "var(--text-main)" }}
        minTickGap={50}
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
        labelFormatter={(label) =>
          format(new Date(label), "PPpp", { locale: es })
        }
        formatter={(value, name) => [value === null || value === undefined ? t("chart.notCollected", "No recogido") : value, name]}
        contentStyle={{
          backgroundColor: "var(--card-bg, #fff)",
          borderColor: "var(--border-light, #ccc)",
          borderRadius: "8px",
          color: "var(--text-main)",
        }}
      />
      <Legend wrapperStyle={{ paddingTop: "10px" }} />
    </>
  );

  const renderChart = () => {
    const hasData1 = chartData.some((d) => d[metric1] !== null);
    const hasData2 = isComparing ? chartData.some((d) => d[metric2] !== null) : true;

    if (chartData.length === 0 || (!hasData1 && !isComparing) || (isComparing && !hasData1 && !hasData2)) {
       return (
         <div className="no-data-chart" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontStyle: "italic", fontSize: "1.1rem" }}>
           {t("data.notCollected", "No recogido")}
         </div>
       );
    }

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
            connectNulls={true}
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
            connectNulls={true}
          />
        </ComposedChart>
      );
    }
    if (chartType === "scatter") {
      return (
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="timeMs"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatXAxis}
            name={t("chart.time")}
            tick={{ fontSize: 10 }}
            minTickGap={50}
          />
          <YAxis
            type="number"
            dataKey={metric1}
            name={conf1.label}
            domain={conf1.domain}
            tick={{ fontSize: 11, fill: conf1.color }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            labelFormatter={(label) =>
              format(new Date(label), "PPpp", { locale: es })
            }
            formatter={(value, name) => [value === null || value === undefined ? t("chart.notCollected", "No recogido") : value, name]}
          />
          <Legend />
          <Scatter name={conf1.label} data={chartData} fill={conf1.color} />
        </ScatterChart>
      );
    }
    if (chartType === "bar")
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
    if (chartType === "line")
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
            connectNulls={true}
          />
        </LineChart>
      );

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
          connectNulls={true}
        />
      </AreaChart>
    );
  };

  return (
    <div className="chart-widget-container">
      <div className="chart-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 className="chart-title" style={{ margin: 0 }}>
            {title}
          </h3>
          {!forcedCompare && (
            <div className="btn-group" style={{ display: "flex", gap: "5px" }}>
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