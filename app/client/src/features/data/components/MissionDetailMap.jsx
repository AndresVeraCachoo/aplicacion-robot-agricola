import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";
import MapUpdater from "./MapUpdater";

import NotCollected from "./NotCollected";
import { formatDate, formatNum } from "../utils/formatters";
import ChartWidget from "../../dashboard/components/ChartWidget";

/**
 * Componente para mostrar el mapa y los detalles de una sesión de misión específica.
 */
const MissionDetailMap = ({
  selectedSession,
  filteredMissionData,
  polygonCoords,
  mapCenter,
  durationStr,
  batteryEst,
  avgHumidity,
  avgTemp,
  avgPh,
  exportToCSV,
  exportToPDF,
  emailCSV,
  emailPDF,
  addToast,
  compMetric1 = "temperature",
  compMetric2 = "humidity",
  t,
  i18n,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (type) => setOpenDropdown(openDropdown === type ? null : type);

  return (
    <div className="mission-map-col">
    {selectedSession ? (
      <>
        <div className="mission-map-header">
          <div>
            <h3>{selectedSession.name}</h3>
            <p>{filteredMissionData.length} {t("data.pointsRegistered")}.</p>
          </div>
          <div className="export-buttons" ref={dropdownRef}>

            {/* Desplegable CSV */}
            <div className="export-dropdown-wrap">
              <button className="btn-export csv" onClick={() => toggle('csv')}>
                📄 CSV ▾
              </button>
              {openDropdown === 'csv' && (
                <div className="export-dropdown-menu">
                  <button onClick={() => { exportToCSV(filteredMissionData, selectedSession.name, i18n.language, addToast, t); setOpenDropdown(null); }}>
                    📥 {t("data.exportCsv", "Descargar CSV")}
                  </button>
                  <button onClick={() => { emailCSV(filteredMissionData, selectedSession.name, i18n.language, addToast, t); setOpenDropdown(null); }}>
                    ✉️ {t("data.emailReport", "Enviar al correo")}
                  </button>
                </div>
              )}
            </div>

            {/* Desplegable PDF */}
            <div className="export-dropdown-wrap">
              <button className="btn-export pdf" onClick={() => toggle('pdf')}>
                📄 PDF ▾
              </button>
              {openDropdown === 'pdf' && (
                <div className="export-dropdown-menu">
                  <button onClick={() => { exportToPDF(filteredMissionData, selectedSession.name, addToast, t); setOpenDropdown(null); }}>
                    📥 {t("data.exportPdf", "Descargar PDF")}
                  </button>
                  <button onClick={() => { emailPDF(filteredMissionData, selectedSession.name, addToast, t); setOpenDropdown(null); }}>
                    ✉️ {t("data.emailReport", "Enviar al correo")}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
        <div id="mission-report-content" className="mission-report-wrapper">
          <div className="mission-physical-stats">
            <div className="stat-pill">⏱️ <strong>{t("data.duration")}:</strong> {durationStr}</div>
            <div className="stat-pill">🔋 <strong>{t("data.batterySpent")}:</strong> {batteryEst}</div>
          </div>
          <div className="mission-map-container">
            <MapContainer center={mapCenter} zoom={17} className="mission-detail-map-view" preferCanvas={true}>
              <MapUpdater center={mapCenter} />
              <TileLayer attribution="&copy; OpenStreetMap" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              {polygonCoords.length > 0 && <Polygon positions={polygonCoords} pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.2 }} />}
              {filteredMissionData.map((d) => (
                <CircleMarker key={d.id || `marker-${d.timestamp}`} center={[d.lat, d.lon]} radius={5} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.8 }}>
                  <Popup>
                    <strong>{t("data.time")}:</strong> {formatDate(d.timestamp, i18n.language)}<br />
                    <strong>{t("data.humidity")}:</strong> {d.humidity === null ? t("data.notCollected", "No recogido") : `${formatNum(d.humidity, 1)}%`}<br />
                    <strong>{t("data.temp")}:</strong> {d.soilTemperature === null ? t("data.notCollected", "No recogido") : `${formatNum(d.soilTemperature, 1)}°C`}<br />
                    <strong>{t("data.ph")}:</strong> {d.ph === null ? t("data.notCollected", "No recogido") : formatNum(d.ph, 1)}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          {filteredMissionData.length > 0 && (
            <div className="mission-summary-bar">
              <div className="summary-item"><span>{t("data.avgHumidity")}</span><strong>{avgHumidity === null ? <NotCollected t={t} /> : `${formatNum(avgHumidity, 1)}%`}</strong></div>
              <div className="summary-item"><span>{t("data.avgTemp")}</span><strong>{avgTemp === null ? <NotCollected t={t} /> : `${formatNum(avgTemp, 1)}°C`}</strong></div>
              <div className="summary-item"><span>{t("data.avgPh")}</span><strong>{avgPh === null ? <NotCollected t={t} /> : formatNum(avgPh, 1)}</strong></div>
            </div>
          )}
        </div>

        {/* Gráficos ocultos para exportación a PDF, filtrados por la misión seleccionada */}
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "1000px" }}>
          {["humidity", "temperature", "ph", "radiation", "nitrogen", "phosphorus", "potassium"].map(metric => (
            <div key={metric} id={`mission-chart-${metric}`} style={{ width: "1000px", height: "450px", background: "white", padding: "20px 20px 40px 20px" }}>
              <ChartWidget
                data={filteredMissionData}
                title=""
                initialType="line"
                initialMetric1={metric}
                disableAnimation={true}
                hideHeader={true}
              />
            </div>
          ))}
          <div id="mission-chart-comparative" style={{ width: "1000px", height: "450px", background: "white", padding: "20px 20px 40px 20px" }}>
             <ChartWidget
                data={filteredMissionData}
                title=""
                initialType="line"
                initialMetric1={compMetric1}
                initialMetric2={compMetric2}
                forcedCompare={true}
                disableAnimation={true}
                hideHeader={true}
              />
          </div>
        </div>
      </>
    ) : (
      <div className="no-mission-selected">
        <span className="icon">🗺️</span>
        <h3>{t("data.noSelection")}</h3>
      </div>
    )}
  </div>
  );
};

MissionDetailMap.propTypes = {
  selectedSession: PropTypes.object,
  filteredMissionData: PropTypes.array.isRequired,
  polygonCoords: PropTypes.array.isRequired,
  mapCenter: PropTypes.array.isRequired,
  durationStr: PropTypes.string.isRequired,
  batteryEst: PropTypes.string.isRequired,
  avgHumidity: PropTypes.number,
  avgTemp: PropTypes.number,
  avgPh: PropTypes.number,
  exportToCSV: PropTypes.func.isRequired,
  exportToPDF: PropTypes.func.isRequired,
  emailCSV: PropTypes.func.isRequired,
  emailPDF: PropTypes.func.isRequired,
  addToast: PropTypes.func.isRequired,
  compMetric1: PropTypes.string,
  compMetric2: PropTypes.string,
  t: PropTypes.func.isRequired,
  i18n: PropTypes.object.isRequired,
};

export default MissionDetailMap;
