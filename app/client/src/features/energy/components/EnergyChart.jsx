// src/features/energy/components/EnergyChart.jsx
import React from "react";
import PropTypes from "prop-types";
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

/**
 * Componente que muestra el gráfico de evolución de batería y carga solar.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Array} props.chartData - Datos formateados para el gráfico.
 * @param {Object} props.currentLocale - Localización date-fns (es o enUS).
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} El componente de gráfico de energía.
 */
function EnergyChart({ chartData, currentLocale, t }) {
  const formatXAxis = (tickItem) =>
    format(new Date(tickItem), "dd/MM HH:mm", { locale: currentLocale });

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        {chartData.length > 0 ? (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 0, left: -20, bottom: 25 }}
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
          <div className="energy-no-data">
            {t(
              "energy.noData",
              "No se encontraron registros de energía para este filtro."
            )}
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}

EnergyChart.propTypes = {
  chartData: PropTypes.array.isRequired,
  currentLocale: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

export default EnergyChart;
