import React from "react";
import PropTypes from "prop-types";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";
import MapUpdater from "./MapUpdater";

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
  n === null || n === undefined || Number.isNaN(Number(n)) ? "-" : Number(n).toFixed(d);

const NotCollected = ({ t }) => (
  <span className="not-collected-text">
    {t("data.notCollected", "No recogido")}
  </span>
);

NotCollected.propTypes = {
  t: PropTypes.func.isRequired,
};

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
  addToast,
  t,
  i18n,
}) => (
  <div className="mission-map-col">
    {selectedSession ? (
      <>
        <div className="mission-map-header">
          <div>
            <h3>{selectedSession.name}</h3>
            <p>{filteredMissionData.length} {t("data.pointsRegistered")}.</p>
          </div>
          <div className="export-buttons">
            <button className="btn-export csv" onClick={() => exportToCSV(filteredMissionData, selectedSession.name, i18n.language, addToast, t)}>
              📥 {t("data.exportCsv")}
            </button>
            <button className="btn-export pdf" onClick={() => exportToPDF(selectedSession.name, addToast, t)}>
              📄 {t("data.exportPdf")}
            </button>
          </div>
        </div>
        <div id="mission-report-content" className="mission-report-wrapper">
          <div className="mission-physical-stats">
            <div className="stat-pill">⏱️ <strong>{t("data.duration")}:</strong> {durationStr}</div>
            <div className="stat-pill">🔋 <strong>{t("data.batterySpent")}:</strong> {batteryEst}</div>
          </div>
          <div className="mission-map-container">
            <MapContainer center={mapCenter} zoom={17} className="mission-detail-map-view">
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
      </>
    ) : (
      <div className="no-mission-selected">
        <span className="icon">🗺️</span>
        <h3>{t("data.noSelection")}</h3>
      </div>
    )}
  </div>
);

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
  addToast: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  i18n: PropTypes.object.isRequired,
};

export default MissionDetailMap;
