// src/pages/DataPage.jsx
import React from "react";
import { useRobotStore } from "../store/robotStore";
import "./DataPage.css";

function DataPage() {
  // PROTECCIÓN 1: Asegurar que siempre sea un array
  const agronomicData = useRobotStore((state) => {
    const data = state.agronomicData;
    return Array.isArray(data) ? data : [];
  });

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "-";
    const n = Number(num);
    if (isNaN(n)) return "-";
    return n.toFixed(decimals);
  };

  return (
    <div className="data-page-container">
      <div className="data-header">
        <div>
          <h1>Monitor en Tiempo Real</h1>
          <p>
            Datos de sensores en vivo.{" "}
            <small style={{ color: "#ef4444" }}>
              (Se mantienen los últimos 50 registros)
            </small>
          </p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Ubicación</th>
              <th>Humedad (%)</th>
              <th>Temp. (°C)</th>
              <th>pH</th>
              <th>N-P-K</th>
              <th>Rad. Solar</th>
            </tr>
          </thead>
          <tbody>
            {agronomicData.length > 0 ? (
              agronomicData.map((row) => (
                <tr key={row.id || Math.random()}>
                  <td className="time-cell">{formatDate(row.timestamp)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                    {formatNumber(row.lat, 5)}, {formatNumber(row.lon, 5)}
                  </td>

                  {/* Barra visual de humedad */}
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span>{formatNumber(row.humedad, 0)}%</span>
                      <div
                        style={{
                          width: "50px",
                          height: "4px",
                          background: "#e2e8f0",
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(row.humedad, 100)}%`,
                            height: "100%",
                            background: "#3b82f6",
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  <td>{formatNumber(row.temperatura_suelo, 1)}°</td>
                  <td>
                    <span className={`ph-badge ${getPhClass(row.ph)}`}>
                      {formatNumber(row.ph, 1)}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.9em", color: "#64748b" }}>
                    {formatNumber(row.nitrogeno, 0)} /{" "}
                    {formatNumber(row.fosforo, 0)} /{" "}
                    {formatNumber(row.potasio, 0)}
                  </td>
                  <td>{formatNumber(row.radiacion_solar, 0)} W</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  Esperando datos del satélite/robot...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getPhClass(val) {
  const ph = Number(val);
  if (!ph && ph !== 0) return "";
  if (ph < 6) return "ph-acid";
  if (ph > 8) return "ph-alkaline";
  return "ph-neutral";
}

export default DataPage;
