// src/pages/DataPage.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../store/robotStore";
import { useMissionStore } from "../store/missionStore";
import ChartWidget from "../features/dashboard/components/ChartWidget";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";
import "./DataPage.css";

const formatDate = (iso, lng) =>
  iso
    ? new Date(iso).toLocaleTimeString(lng || "es-ES", {
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

function DataPage() {
  const { t, i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const itemsPerPage = 10;

  const agronomicData = useRobotStore((state) =>
    Array.isArray(state.agronomicData) ? state.agronomicData : [],
  );
  const deleteSessionData = useRobotStore((state) => state.deleteSessionData);

  const { misiones, fetchMisiones } = useMissionStore();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const totalItems = agronomicData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    fetchMisiones();
  }, [fetchMisiones]);

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

  // --- LÓGICA DE AGRUPACIÓN DE HISTORIAL DE EJECUCIONES ---
  const executedSessionsMap = new Map();

  agronomicData.forEach((d) => {
    if (!d.nombre_mision) return;

    const key = d.ejecucion_id
      ? `exec-${d.ejecucion_id}`
      : `miss-${d.nombre_mision}`;

    if (!executedSessionsMap.has(key)) {
      const template = misiones.find((m) => m.nombre === d.nombre_mision);
      executedSessionsMap.set(key, {
        id: key,
        nombre: d.nombre_mision,
        template: template,
        dataPoints: [],
        startTime: d.timestamp,
        endTime: d.timestamp,
      });
    }

    const session = executedSessionsMap.get(key);
    session.dataPoints.push(d);

    if (new Date(d.timestamp) < new Date(session.startTime))
      session.startTime = d.timestamp;
    if (new Date(d.timestamp) > new Date(session.endTime))
      session.endTime = d.timestamp;
  });

  const executedSessions = Array.from(executedSessionsMap.values()).sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  );

  const selectedSession =
    executedSessions.find((s) => s.id === selectedSessionId) || null;
  const filteredMissionData = selectedSession ? selectedSession.dataPoints : [];
  const polygonCoords =
    selectedSession?.template?.area_trabajo?.coordinates[0]?.map((c) => [
      c[1],
      c[0],
    ]) || [];

  // Cálculos de Misión (Tiempo y Batería)
  let durationStr = "--";
  let batteryEst = "--";

  if (filteredMissionData.length > 0) {
    const timestamps = filteredMissionData.map((d) =>
      new Date(d.timestamp).getTime(),
    );
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const diffMs = maxTime - minTime;
    const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    const secs = diffSeconds % 60;

    if (hours > 0) {
      durationStr = `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      durationStr = `${mins}m ${secs}s`;
    } else {
      durationStr = `${secs}s`;
    }

    const batteryConsumed = diffSeconds * 0.5;
    batteryEst = `${Math.min(100, batteryConsumed).toFixed(1)}%`;
  }

  const handleExportCSV = () => {
    if (filteredMissionData.length === 0) {
      alert("No hay datos registrados en memoria para esta misión.");
      return;
    }

    const headers =
      "Hora,Latitud,Longitud,Humedad_%,Temperatura_C,pH,Nitrogeno,Fosforo,Potasio,Rad_Solar_W\n";
    const rows = filteredMissionData
      .map((d) => {
        const time = new Date(d.timestamp).toLocaleString(
          i18n.language || "es-ES",
        );
        return `"${time}",${d.lat},${d.lon},${d.humedad},${d.temperatura_suelo},${d.ph},${d.nitrogeno},${d.fosforo},${d.potasio},${d.radiacion_solar}`;
      })
      .join("\n");

    const csvContent =
      "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute(
      "download",
      `datos_mision_${selectedSession.nombre.replaceAll(/\s+/g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("mission-report-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `Reporte_Mision_${selectedSession.nombre.replaceAll(/\s+/g, "_")}.pdf`,
      );
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Ocurrió un error al generar el PDF.");
    }
  };

  return (
    <div className="data-page-container">
      <div className="data-header">
        <h1>{t("data.title")}</h1>
        <p>{t("data.subtitle")}</p>
      </div>

      {agronomicData.length > 0 && (
        <div className="chart-section">
          <ChartWidget
            data={agronomicData}
            title={t("data.individualAnalysis")}
            initialType="line"
            initialMetric1="nitrogeno"
          />
        </div>
      )}

      {agronomicData.length > 0 && (
        <div className="chart-section">
          <ChartWidget
            data={agronomicData}
            title={t("data.comparativeAnalysis")}
            initialType="compare"
            initialMetric1="temperatura_suelo"
            initialMetric2="humedad"
            forcedCompare={true}
          />
        </div>
      )}

      <div className="table-card">
        <div className="table-header-internal">
          <h3>{t("data.recordsTable")}</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("data.time")}</th>
                <th>Misión</th>
                <th>{t("data.location")}</th>
                <th>{t("data.humidity")}</th>
                <th>{t("data.temp")}</th>
                <th>{t("data.ph")}</th>
                <th>{t("data.npk")}</th>
                <th>{t("data.solarRad")}</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((row, index) => (
                  <tr key={row.id || `${row.timestamp}-${index}`}>
                    <td className="time-cell">
                      {formatDate(row.timestamp, i18n.language)}
                    </td>

                    <td>
                      {row.nombre_mision ? (
                        <span className="mission-badge-auto">
                          {row.nombre_mision}
                        </span>
                      ) : (
                        <span className="mission-badge-manual">Manual</span>
                      )}
                    </td>

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
                    <td className="npk-cell">
                      {formatNum(row.nitrogeno, 0)} /{" "}
                      {formatNum(row.fosforo, 0)} / {formatNum(row.potasio, 0)}
                    </td>
                    <td>{formatNum(row.radiacion_solar, 0)} W</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    {t("data.waitingData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-left">
              <span className="pagination-info">
                {t("data.page")} <strong>{currentPage}</strong> {t("data.of")}{" "}
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
              <span className="pagination-total">
                {totalItems} {t("data.records")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- WIDGET: HISTORIAL DE MISIONES EJECUTADAS --- */}
      <div className="mission-analysis-widget">
        {/* Columna Izquierda: Lista de Sesiones */}
        <div className="mission-list-col">
          <div className="mission-list-header">
            <h3>Historial de Ejecuciones</h3>
            <p>Sesiones guardadas en memoria</p>
          </div>
          <div className="mission-items">
            {executedSessions.length > 0 ? (
              executedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`mission-item-wrapper ${selectedSession?.id === s.id ? "active" : ""}`}
                >
                  <button
                    className="mission-item-main"
                    onClick={() => setSelectedSessionId(s.id)}
                    aria-pressed={selectedSession?.id === s.id}
                  >
                    <h4>{s.nombre}</h4>
                    <div className="mission-item-meta">
                      <span>
                        {new Date(s.endTime).toLocaleTimeString(
                          i18n.language || "es-ES",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                      <span className="points-badge">
                        {s.dataPoints.length} pts
                      </span>
                    </div>
                  </button>
                  <button
                    className="btn-delete-session"
                    title="Eliminar del historial"
                    aria-label="Eliminar misión"
                    type="button" /* Asegura su prioridad sobre forms */
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteSessionData(s.id);
                      if (selectedSessionId === s.id) {
                        setSelectedSessionId(null);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))
            ) : (
              <p className="no-missions-text">
                Aún no se han ejecutado misiones.
              </p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Mapa, Resumen y Exportación */}
        <div className="mission-map-col">
          {selectedSession ? (
            <>
              <div className="mission-map-header">
                <div>
                  <h3>{selectedSession.nombre}</h3>
                  <p>
                    {filteredMissionData.length} puntos de datos registrados.
                  </p>
                </div>
                <div className="export-buttons">
                  <button className="btn-export csv" onClick={handleExportCSV}>
                    📥 CSV
                  </button>
                  <button className="btn-export pdf" onClick={handleExportPDF}>
                    📄 PDF
                  </button>
                </div>
              </div>

              {/* Contenedor que capturará html2canvas */}
              <div
                id="mission-report-content"
                className="mission-report-wrapper"
              >
                {/* Panel de Estadísticas Físicas (Tiempo/Batería) */}
                <div className="mission-physical-stats">
                  <div className="stat-pill">
                    ⏱️ <strong>Duración:</strong> {durationStr}
                  </div>
                  <div className="stat-pill">
                    🔋 <strong>Batería Gastada:</strong> {batteryEst}
                  </div>
                </div>

                <div className="mission-map-container">
                  <MapContainer
                    center={
                      polygonCoords.length > 0
                        ? polygonCoords[0]
                        : [42.36317, -3.69882]
                    }
                    zoom={17}
                    style={{ height: "100%", width: "100%", zIndex: 1 }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {polygonCoords.length > 0 && (
                      <Polygon
                        positions={polygonCoords}
                        pathOptions={{
                          color: "#10b981",
                          fillColor: "#10b981",
                          fillOpacity: 0.2,
                        }}
                      />
                    )}

                    {filteredMissionData.map((d) => (
                      <CircleMarker
                        key={d.id || `marker-${d.timestamp}`}
                        center={[d.lat, d.lon]}
                        radius={5}
                        pathOptions={{
                          color: "#3b82f6",
                          fillColor: "#3b82f6",
                          fillOpacity: 0.8,
                        }}
                      >
                        <Popup>
                          <strong>Hora:</strong>{" "}
                          {formatDate(d.timestamp, i18n.language)}
                          <br />
                          <strong>Humedad:</strong> {formatNum(d.humedad, 1)}%
                          <br />
                          <strong>Temp:</strong>{" "}
                          {formatNum(d.temperatura_suelo, 1)}°C
                          <br />
                          <strong>pH:</strong> {formatNum(d.ph, 1)}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>

                {/* Resumen Promedio */}
                {filteredMissionData.length > 0 && (
                  <div className="mission-summary-bar">
                    <div className="summary-item">
                      <span>Humedad Media</span>
                      <strong>
                        {formatNum(
                          filteredMissionData.reduce(
                            (acc, curr) => acc + Number(curr.humedad),
                            0,
                          ) / filteredMissionData.length,
                          1,
                        )}
                        %
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>Temp. Media</span>
                      <strong>
                        {formatNum(
                          filteredMissionData.reduce(
                            (acc, curr) => acc + Number(curr.temperatura_suelo),
                            0,
                          ) / filteredMissionData.length,
                          1,
                        )}
                        °C
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>pH Medio</span>
                      <strong>
                        {formatNum(
                          filteredMissionData.reduce(
                            (acc, curr) => acc + Number(curr.ph),
                            0,
                          ) / filteredMissionData.length,
                          1,
                        )}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-mission-selected">
              <span className="icon">🗺️</span>
              <h3>Sin Selección</h3>
              <p>
                Ejecuta una misión y selecciónala en el historial para ver su
                reporte.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataPage;
