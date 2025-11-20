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
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // PROTECCIÓN 2: Función segura para formatear números
  // Convierte el valor a número antes de usar toFixed.
  // Si viene como texto "42.35", lo convierte a número 42.35 y luego lo formatea.
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "-";
    const n = Number(num);
    if (isNaN(n)) return "-";
    return n.toFixed(decimals);
  };

  return (
    <div className="data-page-container">
      <div className="data-header">
        <h1>Registros Agronómicos</h1>
        <p>Datos recogidos por los sensores del robot en tiempo real.</p>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Ubicación</th>
              <th>Humedad (%)</th>
              <th>Temp. Suelo (°C)</th>
              <th>pH</th>
              <th>Nitrógeno (N)</th>
              <th>Fósforo (P)</th>
              <th>Potasio (K)</th>
              <th>Rad. Solar</th>
            </tr>
          </thead>
          <tbody>
            {agronomicData.length > 0 ? (
              agronomicData.map((row) => (
                <tr key={row.id || Math.random()}>
                  <td>{formatDate(row.timestamp)}</td>
                  <td>
                    {/* Usamos la función segura aquí */}
                    {formatNumber(row.lat, 5)}, {formatNumber(row.lon, 5)}
                  </td>
                  <td>{formatNumber(row.humedad)}%</td>
                  <td>{formatNumber(row.temperatura_suelo)}°</td>
                  <td>
                    <span className={`ph-badge ${getPhClass(row.ph)}`}>
                      {formatNumber(row.ph, 1)}
                    </span>
                  </td>
                  <td>{formatNumber(row.nitrogeno)}</td>
                  <td>{formatNumber(row.fosforo)}</td>
                  <td>{formatNumber(row.potasio)}</td>
                  <td>{formatNumber(row.radiacion_solar)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">
                  No hay datos registrados aún.
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
  const ph = Number(val); // Aseguramos que sea número para comparar
  if (!ph && ph !== 0) return "";
  if (ph < 6) return "ph-acid";
  if (ph > 8) return "ph-alkaline";
  return "ph-neutral";
}

export default DataPage;
