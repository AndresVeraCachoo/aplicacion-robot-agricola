import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../store/robotStore";
import { useMissionStore } from "../store/missionStore";
import { useToast } from "../context/ToastContext";
import ChartWidget from "../features/dashboard/components/ChartWidget";
import { DateRangePicker } from "../components/DateRangePicker";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./DataPage.css";

const API_URL = import.meta.env.VITE_API_URL;

// ==========================================
// 🧠 FUNCIONES PURAS EXTRÍDAS
// ==========================================

const formatDate = (iso, lng) =>
  iso
    ? new Date(iso).toLocaleString(lng || "es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

const formatNum = (n, d = 2) =>
  n === null || Number.isNaN(Number(n)) ? "-" : Number(n).toFixed(d);

const getPhClass = (val) => {
  const ph = Number(val);
  if (!ph && ph !== 0) return "";
  if (ph < 6) return "ph-acid";
  if (ph > 8) return "ph-alkaline";
  return "ph-neutral";
};

const groupSessions = (data, misiones) => {
  const map = new Map();
  data.forEach((d) => {
    if (!d.nombre_mision) return;
    const key = d.ejecucion_id
      ? `exec-${d.ejecucion_id}`
      : `miss-${d.nombre_mision}`;

    if (!map.has(key)) {
      const template = misiones.find((m) => m.nombre === d.nombre_mision);
      map.set(key, {
        id: key,
        nombre: d.nombre_mision,
        template,
        dataPoints: [],
        startTime: d.timestamp,
        endTime: d.timestamp,
      });
    }
    const session = map.get(key);
    session.dataPoints.push(d);
    if (new Date(d.timestamp) < new Date(session.startTime))
      session.startTime = d.timestamp;
    if (new Date(d.timestamp) > new Date(session.endTime))
      session.endTime = d.timestamp;
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  );
};

const calculateStats = (missionData) => {
  if (missionData.length === 0) return { durationStr: "--", batteryEst: "--" };
  const timestamps = missionData.map((d) => new Date(d.timestamp).getTime());
  const diffSeconds = Math.max(
    1,
    Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / 1000),
  );
  const hours = Math.floor(diffSeconds / 3600);
  const mins = Math.floor((diffSeconds % 3600) / 60);
  const secs = diffSeconds % 60;
  let durationStr = `${secs}s`;
  if (hours > 0) durationStr = `${hours}h ${mins}m ${secs}s`;
  else if (mins > 0) durationStr = `${mins}m ${secs}s`;
  return {
    durationStr,
    batteryEst: `${Math.min(100, diffSeconds * 0.5).toFixed(1)}%`,
  };
};

const exportToCSV = (missionData, sessionName, lng, addToast, t) => {
  if (missionData.length === 0) return;
  const headers =
    "Hora,Latitud,Longitud,Humedad_%,Temperatura_C,pH,Nitrogeno,Fosforo,Potasio,Rad_Solar_W\n";
  const rows = missionData
    .map(
      (d) =>
        `"${new Date(d.timestamp).toLocaleString(lng)}",${d.lat},${d.lon},${d.humedad},${d.temperatura_suelo},${d.ph},${d.nitrogeno},${d.fosforo},${d.potasio},${d.radiacion_solar}`,
    )
    .join("\n");
  const link = document.createElement("a");
  link.href =
    "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
  link.download = `datos_mision_${sessionName.replaceAll(/\s+/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  addToast(t("data.csvSuccess"), "success");
};

const exportToPDF = async (sessionName, addToast, t) => {
  const element = document.getElementById("mission-report-content");
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width,
    );
    pdf.save(`Reporte_Mision_${sessionName.replaceAll(/\s+/g, "_")}.pdf`);
    addToast(t("data.pdfSuccess"), "success");
  } catch (error) {
    console.error("Error generando PDF:", error);
    addToast(t("data.pdfError"), "error");
  }
};

const getMapCenterAndPolygon = (selectedSession, filteredMissionData) => {
  const polygonCoords =
    selectedSession?.template?.area_trabajo?.coordinates[0]?.map((c) => [
      c[1],
      c[0],
    ]) || [];
  let mapCenter = [42.36317, -3.69882];
  if (polygonCoords.length > 0) mapCenter = polygonCoords[0];
  else if (filteredMissionData.length > 0)
    mapCenter = [filteredMissionData[0].lat, filteredMissionData[0].lon];
  return { polygonCoords, mapCenter };
};

// ==========================================
// 🚀 COMPONENTE PRINCIPAL
// ==========================================

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 17, { duration: 1.5 });
  }, [center, map]);
  return null;
}
MapUpdater.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
};

function DataPage() {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const itemsPerPage = 10;

  const [filteredData, setFilteredData] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const liveAgronomicData = useRobotStore((state) =>
    Array.isArray(state.agronomicData) ? state.agronomicData : [],
  );
  const deleteSessionData = useRobotStore((state) => state.deleteSessionData);
  const { misiones, fetchMisiones } = useMissionStore();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const displayDataRaw =
    filteredData === null ? liveAgronomicData : filteredData;
  const displayData = [...displayDataRaw].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );
  const totalPages = Math.ceil(displayData.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);
  useEffect(() => {
    fetchMisiones();
  }, [fetchMisiones]);

  const handleFilter = async (start, end, misionId) => {
    if (!start && !end && !misionId) {
      setFilteredData(null);
      return;
    }
    setIsFiltering(true);
    try {
      const params = new URLSearchParams();
      if (start && end) {
        params.append("start", start);
        params.append("end", end);
      }
      if (misionId) {
        params.append("misionId", misionId);
      }

      const response = await axios.get(
        `${API_URL}/robot/datos?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setFilteredData(response.data);
      setCurrentPage(1);
      addToast(t("data.recordsFound", { count: response.data.length }), "info");
    } catch (error) {
      console.error("Error al filtrar datos:", error);
      addToast(t("data.fetchError"), "error");
    } finally {
      setIsFiltering(false);
    }
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const num = Number(jumpPage);
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      setJumpPage("");
    }
  };

  const executedSessions = groupSessions(displayData, misiones);
  const selectedSession =
    executedSessions.find((s) => s.id === selectedSessionId) || null;
  const filteredMissionData = selectedSession ? selectedSession.dataPoints : [];
  const { polygonCoords, mapCenter } = getMapCenterAndPolygon(
    selectedSession,
    filteredMissionData,
  );
  const { durationStr, batteryEst } = calculateStats(filteredMissionData);

  return (
    <div className="data-page-container">
      <DateRangePicker onFilter={handleFilter} misiones={misiones} />

      {isFiltering ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h3>{t("data.waitingData")} ⏳</h3>
        </div>
      ) : (
        <>
          {displayData.length > 0 && (
            <div className="chart-section">
              <ChartWidget
                data={displayData}
                title={t("data.individualAnalysis")}
                initialType="line"
                initialMetric1="nitrogeno"
              />
            </div>
          )}

          {displayData.length > 0 && (
            <div className="chart-section">
              <ChartWidget
                data={displayData}
                title={t("data.comparativeAnalysis")}
                initialType="compare"
                initialMetric1="temperatura_suelo"
                initialMetric2="humedad"
                forcedCompare={true}
              />
            </div>
          )}

          <div
            className="table-card"
            style={{ paddingBottom: "0px", overflow: "hidden" }}
          >
            <div className="table-header-internal">
              <h3>
                {filteredData
                  ? t("data.searchResults")
                  : t("data.recordsTable")}
              </h3>
            </div>

            <div
              className="table-responsive"
              style={{
                maxHeight: "none",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table className="data-table" style={{ marginBottom: "0px" }}>
                <thead>
                  <tr>
                    <th>{t("data.time")}</th>
                    <th>{t("data.missions")}</th>
                    <th>{t("data.location")}</th>
                    <th>{t("data.humidity")}</th>
                    <th>{t("data.temp")}</th>
                    <th>{t("data.ph")}</th>
                    <th>{t("data.npk")}</th>
                    <th>{t("data.solarRad")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage,
                  ).length > 0 ? (
                    displayData
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage,
                      )
                      .map((row, index) => (
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
                              <span className="mission-badge-manual">
                                {t("data.manual")}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.85em",
                            }}
                          >
                            {formatNum(row.lat, 5)}, {formatNum(row.lon, 5)}
                          </td>
                          <td>
                            <div className="humidity-bar-container">
                              <span>{formatNum(row.humedad, 0)}%</span>
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(row.humedad, 100)}%`,
                                  }}
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
                            {formatNum(row.fosforo, 0)} /{" "}
                            {formatNum(row.potasio, 0)}
                          </td>
                          <td>{formatNum(row.radiacion_solar, 0)} W</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">
                        {filteredData
                          ? t("data.noDataFilter")
                          : t("data.waitingData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {displayData.length > 0 && (
              <div
                className="pagination-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "15px 20px",
                  borderTop: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {t("data.page")} <strong>{currentPage}</strong> {t("data.of")}{" "}
                  <strong>{totalPages}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    &larr;
                  </button>
                  <form
                    onSubmit={handleJumpToPage}
                    className="pagination-jump"
                    style={{
                      margin: "0 10px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={jumpPage}
                      onChange={(e) => setJumpPage(e.target.value)}
                      placeholder="..."
                      style={{
                        width: "45px",
                        textAlign: "center",
                        padding: "4px",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!jumpPage}
                      style={{ padding: "4px 8px" }}
                    >
                      {t("data.go")}
                    </button>
                  </form>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    &rarr;
                  </button>
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "right",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {displayData.length} {t("data.totalRecords")}
                </div>
              </div>
            )}
          </div>

          <div className="mission-analysis-widget">
            <div className="mission-list-col">
              <div className="mission-list-header">
                <h3>{t("data.executionHistory")}</h3>
                <p>{t("data.sessionsPeriod")}</p>
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
                            {s.dataPoints.length} {t("data.pts")}
                          </span>
                        </div>
                      </button>
                      <button
                        className="btn-delete-session"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSessionData(s.id);
                          if (selectedSessionId === s.id)
                            setSelectedSessionId(null);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-missions-text">
                    {t("data.noMissionsFilter")}
                  </p>
                )}
              </div>
            </div>

            <div className="mission-map-col">
              {selectedSession ? (
                <>
                  <div className="mission-map-header">
                    <div>
                      <h3>{selectedSession.nombre}</h3>
                      <p>
                        {filteredMissionData.length}{" "}
                        {t("data.pointsRegistered")}.
                      </p>
                    </div>
                    <div className="export-buttons">
                      <button
                        className="btn-export csv"
                        onClick={() =>
                          exportToCSV(
                            filteredMissionData,
                            selectedSession.nombre,
                            i18n.language,
                            addToast,
                            t,
                          )
                        }
                      >
                        📥 {t("data.exportCsv")}
                      </button>
                      <button
                        className="btn-export pdf"
                        onClick={() =>
                          exportToPDF(selectedSession.nombre, addToast, t)
                        }
                      >
                        📄 {t("data.exportPdf")}
                      </button>
                    </div>
                  </div>
                  <div
                    id="mission-report-content"
                    className="mission-report-wrapper"
                  >
                    <div className="mission-physical-stats">
                      <div className="stat-pill">
                        ⏱️ <strong>{t("data.duration")}:</strong> {durationStr}
                      </div>
                      <div className="stat-pill">
                        🔋 <strong>{t("data.batterySpent")}:</strong>{" "}
                        {batteryEst}
                      </div>
                    </div>
                    <div className="mission-map-container">
                      <MapContainer
                        center={mapCenter}
                        zoom={17}
                        style={{ height: "100%", width: "100%", zIndex: 1 }}
                      >
                        <MapUpdater center={mapCenter} />
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
                              <strong>{t("data.time")}:</strong>{" "}
                              {formatDate(d.timestamp, i18n.language)}
                              <br />
                              <strong>{t("data.humidity")}:</strong>{" "}
                              {formatNum(d.humedad, 1)}%<br />
                              <strong>{t("data.temp")}:</strong>{" "}
                              {formatNum(d.temperatura_suelo, 1)}°C
                              <br />
                              <strong>{t("data.ph")}:</strong>{" "}
                              {formatNum(d.ph, 1)}
                            </Popup>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>
                    {filteredMissionData.length > 0 && (
                      <div className="mission-summary-bar">
                        <div className="summary-item">
                          <span>{t("data.avgHumidity")}</span>
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
                          <span>{t("data.avgTemp")}</span>
                          <strong>
                            {formatNum(
                              filteredMissionData.reduce(
                                (acc, curr) =>
                                  acc + Number(curr.temperatura_suelo),
                                0,
                              ) / filteredMissionData.length,
                              1,
                            )}
                            °C
                          </strong>
                        </div>
                        <div className="summary-item">
                          <span>{t("data.avgPh")}</span>
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
                  <h3>{t("data.noSelection")}</h3>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DataPage;
