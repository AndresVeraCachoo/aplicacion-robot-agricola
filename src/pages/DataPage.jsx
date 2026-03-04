// src/pages/DataPage.jsx
import React, { useState, useEffect } from "react";
import { useRobotStore } from "../store/robotStore";
import ChartWidget from "../features/dashboard/components/ChartWidget";
import "./DataPage.css";

// --- Funciones Utilitarias (Movidas fuera para optimizar memoria) ---

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

const formatNum = (n, d = 2) =>
  n === null || Number.isNaN(Number(n)) ? "-" : Number(n).toFixed(d);

function getPhClass(val) {
  const ph = Number(val);
  if (!ph && ph !== 0) return "";
  if (ph < 6) return "ph-acid";
  if (ph > 8) return "ph-alkaline";
  return "ph-neutral";
}

// --- Componente Principal ---
function DataPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const itemsPerPage = 10;

  const agronomicData = useRobotStore((state) => {
    const data = state.agronomicData;
    return Array.isArray(data) ? data : [];
  });

  // --- Lógica Paginación ---
  const totalItems = agronomicData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const currentData = agronomicData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const num = Number(jumpPage);
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      setJumpPage("");
    }
  };

  return (
    <div className="data-page-container">
      {/* Cabecera Simple */}
      <div className="data-header">
        <h1>Monitor Avanzado</h1>
        <p>Análisis multi-variable en tiempo real.</p>
      </div>

      {/* --- BLOQUE 1: GRÁFICA INDIVIDUAL (Flexible) --- */}
      {agronomicData.length > 0 && (
        <div className="chart-section">
          <ChartWidget
            data={agronomicData}
            title="Análisis Individual"
            initialType="line"
            initialMetric1="nitrogeno"
            // allowCompare=true por defecto
          />
        </div>
      )}

      {/* --- BLOQUE 2: GRÁFICA COMPARATIVA (Forzada) --- */}
      {agronomicData.length > 0 && (
        <div className="chart-section">
          <ChartWidget
            data={agronomicData}
            title="Comparativa de Variables"
            initialType="compare"
            initialMetric1="temperatura_suelo"
            initialMetric2="humedad"
            forcedCompare={true} // Fuerza el modo comparación siempre
          />
        </div>
      )}

      {/* --- BLOQUE 3: TABLA DE DATOS --- */}
      <div className="table-card">
        <div className="table-header-internal">
          <h3>Tabla de Registros</h3>
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
              {currentData.length > 0 ? (
                currentData.map((row, index) => (
                  <tr key={row.id || `${row.timestamp}-${index}`}>
                    <td className="time-cell">{formatDate(row.timestamp)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                      {formatNum(row.lat, 5)}, {formatNum(row.lon, 5)}
                    </td>
                    <td>
                      <div className="humidity-bar-container">
                        <span>{formatNum(row.humedad, 0)}%</span>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.min(row.humedad, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>{formatNum(row.temperatura_suelo, 1)}°</td>
                    <td>
                      <span className={`ph-badge ${getPhClass(row.ph)}`}>
                        {formatNum(row.ph, 1)}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.9em", color: "#64748b" }}>
                      {formatNum(row.nitrogeno, 0)} /{" "}
                      {formatNum(row.fosforo, 0)} / {formatNum(row.potasio, 0)}
                    </td>
                    <td>{formatNum(row.radiacion_solar, 0)} W</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    Esperando datos...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles Paginación */}
        {totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-left">
              <span className="pagination-info">
                Página <strong>{currentPage}</strong> de{" "}
                <strong>{totalPages}</strong>
              </span>
            </div>
            <div className="pagination-center">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &larr;
              </button>
              <form onSubmit={handleJumpToPage} className="pagination-jump">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  placeholder="..."
                />
                <button type="submit" disabled={!jumpPage}>
                  Go
                </button>
              </form>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &rarr;
              </button>
            </div>
            <div className="pagination-right">
              <span className="pagination-total">{totalItems} registros</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataPage;
