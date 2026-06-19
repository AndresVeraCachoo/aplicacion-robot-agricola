// src/features/dashboard/components/MapView.jsx
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Polygon,
  LayersControl,
  useMap,
  useMapEvents,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";

import { useRobotStore } from "../../../store/robotStore.js";
import Modal from "../../../components/Modal.jsx";
import { useToast } from "../../../context/ToastContext.jsx";
import FieldDataOverlay from "./FieldDataOverlay.jsx";
import "./MapView.css";

// --- Constantes ---
const BASE_STATION_COORDS = [42.36317, -3.69882];
const DEFAULT_COORDS = [42.3525, -3.6845];

const baseStationIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">⚡</div>`,
  className: "base-marker-icon",
  iconSize: [45, 45],
  iconAnchor: [22, 22],
});

const getRobotIcon = (heading) => {
  return L.divIcon({
    html: `<img src="/robot-arrow.svg" style="transform: rotate(${heading || 0}deg); width: 100%; height: 100%;" />`,
    className: "robot-marker-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// --- Funciones Auxiliares ---
const isPointInPolygon = (point, vs) => {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

const getColorByPH = (phVal) => {
  if (phVal === null || phVal === undefined) return "#9ca3af";
  const ph = Number(phVal);
  if (ph < 6) return "#ef4444";
  if (ph > 7.5) return "#3b82f6";
  return "#22c55e";
};

const calculateZoneStats = (safeZone, agronomicData) => {
  if (!safeZone || agronomicData.length === 0) return null;

  const pointsInZone = agronomicData.filter((p) => {
    if (!p.lat || !p.lon) return false;
    return isPointInPolygon([Number(p.lat), Number(p.lon)], safeZone);
  });

  if (pointsInZone.length === 0) return null;

  let totals = { ph: 0, hum: 0, temp: 0, n: 0, p: 0, k: 0 };
  let counts = { ph: 0, hum: 0, temp: 0, n: 0, p: 0, k: 0 };

  pointsInZone.forEach(p => {
    if (p.ph !== null && p.ph !== undefined) { totals.ph += Number(p.ph); counts.ph++; }
    if (p.humidity !== null && p.humidity !== undefined) { totals.hum += Number(p.humidity); counts.hum++; }
    if (p.temperature !== null && p.temperature !== undefined) { totals.temp += Number(p.temperature); counts.temp++; }
    if (p.nitrogen !== null && p.nitrogen !== undefined) { totals.n += Number(p.nitrogen); counts.n++; }
    if (p.phosphorus !== null && p.phosphorus !== undefined) { totals.p += Number(p.phosphorus); counts.p++; }
    if (p.potassium !== null && p.potassium !== undefined) { totals.k += Number(p.potassium); counts.k++; }
  });

  return {
    count: pointsInZone.length,
    avgPh: counts.ph > 0 ? (totals.ph / counts.ph).toFixed(1) : "N/A",
    avgHum: counts.hum > 0 ? (totals.hum / counts.hum).toFixed(0) : "N/A",
    avgTemp: counts.temp > 0 ? (totals.temp / counts.temp).toFixed(1) : "N/A",
    avgN: counts.n > 0 ? (totals.n / counts.n).toFixed(0) : "N/A",
    avgP: counts.p > 0 ? (totals.p / counts.p).toFixed(0) : "N/A",
    avgK: counts.k > 0 ? (totals.k / counts.k).toFixed(0) : "N/A",
  };
};

// --- Subcomponentes Refactorizados ---

function SampleMarker({ sample, isVisible, onClick }) {
  if (!sample.lat || !sample.lon) return null;

  const handleClick = (e) => {
    L.DomEvent.stopPropagation(e);
    if (isVisible) onClick(sample);
  };

  return (
    <CircleMarker
      center={[sample.lat, sample.lon]}
      radius={isVisible ? 6 : 2}
      pathOptions={{
        color: "white",
        weight: 1,
        fillColor: getColorByPH(sample.ph),
        fillOpacity: isVisible ? 0.9 : 0.1,
      }}
      eventHandlers={{ click: handleClick }}
    >
      {isVisible && (
        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
          <span style={{ fontWeight: 600 }}>pH: {sample.ph === null ? 'N/A' : sample.ph}</span>
        </Tooltip>
      )}
    </CircleMarker>
  );
}

SampleMarker.propTypes = {
  sample: PropTypes.object.isRequired,
  isVisible: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function ZoneDrawer({ isDrawing, onZoneComplete, onCancel }) {
  const [points, setPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const map = useMap();

  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = "crosshair";
      map.dragging.disable();
    } else {
      map.getContainer().style.cursor = "";
      map.dragging.enable();
      setPoints([]);
      setMousePos(null);
    }
  }, [isDrawing, map]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isDrawing) onCancel();
    };
    globalThis.addEventListener("keydown", handleEsc);
    return () => globalThis.removeEventListener("keydown", handleEsc);
  }, [isDrawing, onCancel]);

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      const newPoint = [e.latlng.lat, e.latlng.lng];
      if (points.length >= 3) {
        const firstPoint = points[0];
        const dist = map.distance(e.latlng, L.latLng(firstPoint));
        if (dist < 20) {
          onZoneComplete(points);
          setPoints([]);
          return;
        }
      }
      setPoints((prev) => [...prev, newPoint]);
    },
    mousemove(e) {
      if (isDrawing) setMousePos([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!isDrawing || points.length === 0) return null;

  const previewPositions = mousePos ? [...points, mousePos] : points;

  return (
    <>
      <Polyline
        positions={previewPositions}
        pathOptions={{ color: "#f97316", dashArray: "5, 5", weight: 3 }}
      />
      {points.map((p, i) => (
        <CircleMarker
          key={`point-${p[0]}-${p[1]}`}
          center={p}
          radius={5}
          pathOptions={{
            color: i === 0 ? "#ef4444" : "#f97316",
            fillColor: "white",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
    </>
  );
}

ZoneDrawer.propTypes = {
  isDrawing: PropTypes.bool.isRequired,
  onZoneComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function MapClickHandler({ onMapClick, isDrawing }) {
  useMapEvents({
    click(e) {
      if (!isDrawing) onMapClick(e.latlng);
    },
  });
  return null;
}

MapClickHandler.propTypes = {
  onMapClick: PropTypes.func.isRequired,
  isDrawing: PropTypes.bool.isRequired,
};

function CenterButtonInternal() {
  const { t } = useTranslation();
  const map = useMap();
  const position = useRobotStore((state) => state.position);

  const centerView = (e) => {
    e.stopPropagation();
    if (position.lat && position.lon) {
      map.setView([position.lat, position.lon], 18, { animate: true });
    }
  };

  return (
    <button
      type="button"
      onClick={centerView}
      className="center-map-button"
      title={t("control.centerRobot")}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7.93-3h-1.02a6.992 6.992 0 0 0-5.91-5.91V4.07h-2v1.02a6.992 6.992 0 0 0-5.91 5.91H4.07v2h1.02a6.992 6.992 0 0 0 5.91 5.91v1.02h2v-1.02a6.992 6.992 0 0 0 5.91-5.91h1.02v-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
      </svg>
    </button>
  );
}

function MapControlsOverlay({
  selectedMetric,
  setSelectedMetric,
  safeZone,
  showZoneSummary,
  setShowZoneSummary,
  handleClearZone,
  isDrawingZone,
  toggleDrawing
}) {
  const { t } = useTranslation();

  return (
    <div className="map-controls-overlay">
      <select
        className="map-btn"
        value={selectedMetric}
        onChange={(e) => setSelectedMetric(e.target.value)}
        title={t("mapAdv.selectHeatmap")}
      >
        <option value="none">{t("mapAdv.layerOff")}</option>
        <option value="humidity">{t("mapAdv.layerHum")}</option>
        <option value="ph">{t("mapAdv.layerPh")}</option>
        <option value="temperature">{t("mapAdv.layerTemp")}</option>
      </select>

      {safeZone ? (
        <div className="zone-active-controls">
          <button
            type="button"
            className="map-btn info"
            onClick={() => setShowZoneSummary(!showZoneSummary)}
            title={t("mapAdv.viewData")}
          >
            {showZoneSummary ? t("mapAdv.hideData") : t("mapAdv.viewData")}
          </button>
          <button
            type="button"
            className="map-btn danger"
            onClick={handleClearZone}
            title={t("mapAdv.clearLimit")}
          >
            <span style={{ fontSize: "1.2em" }}>🗑️</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`map-btn ${isDrawingZone ? "active danger" : ""}`}
          onClick={toggleDrawing}
          title={t("mapAdv.drawArea")}
        >
          {isDrawingZone
            ? `❌ ${t("users.cancel")}`
            : `✏️ ${t("mapAdv.drawArea")}`}
        </button>
      )}
    </div>
  );
}

MapControlsOverlay.propTypes = {
  selectedMetric: PropTypes.string.isRequired,
  setSelectedMetric: PropTypes.func.isRequired,
  safeZone: PropTypes.array,
  showZoneSummary: PropTypes.bool.isRequired,
  setShowZoneSummary: PropTypes.func.isRequired,
  handleClearZone: PropTypes.func.isRequired,
  isDrawingZone: PropTypes.bool.isRequired,
  toggleDrawing: PropTypes.func.isRequired,
};

function ZoneSummaryPanel({ zoneStats, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="zone-summary-panel">
      <div className="summary-header">
        <h4>{t("mapAdv.areaSummary")}</h4>
        <button type="button" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="summary-metric main">
        <span className="label">{t("mapAdv.avgPh")}</span>
        <span
          className="value"
          style={{ color: getColorByPH(zoneStats.avgPh) }}
        >
          {zoneStats.avgPh}
        </span>
      </div>
      <div className="summary-grid">
        <div className="metric-box">
          <span>{t("mapAdv.humidity")}</span>
          <strong>{zoneStats.avgHum === "N/A" ? "N/A" : `${zoneStats.avgHum}%`}</strong>
        </div>
        <div className="metric-box">
          <span>{t("mapAdv.temp")}</span>
          <strong>{zoneStats.avgTemp === "N/A" ? "N/A" : `${zoneStats.avgTemp}°C`}</strong>
        </div>
        <div className="metric-box full">
          <span>{t("mapAdv.avgNutrients")}</span>
          <div className="mini-npk">
            <span className="n">N: {zoneStats.avgN}</span>
            <span className="p">P: {zoneStats.avgP}</span>
            <span className="k">K: {zoneStats.avgK}</span>
          </div>
        </div>
      </div>
      <div className="summary-footer">
        {zoneStats.count} {t("mapAdv.samplesAnalyzed")}
      </div>
    </div>
  );
}

ZoneSummaryPanel.propTypes = {
  zoneStats: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

function SampleModal({ isOpen, onClose, sample }) {
  const { t } = useTranslation();

  if (!sample) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        sample.id
          ? `${t("mapAdv.sample")} #${sample.id}`
          : t("mapAdv.detail")
      }
    >
      <div className="sample-popup-content">
        <div className="popup-header">
          <div className="popup-kpi">
            <span className="label">pH</span>
            <span
              className="value"
              style={{ color: getColorByPH(sample.ph) }}
            >
              {sample.ph === null ? t("mapAdv.notCollected", "No recogido") : sample.ph}
            </span>
          </div>
          <div className="popup-date">
            {sample.timestamp
              ? new Date(sample.timestamp).toLocaleString()
              : "-"}
          </div>
        </div>

        <div className="popup-grid">
          <div className="popup-row">
            <span>🌡️ {t("mapAdv.soil")}:</span>{" "}
            <strong>{sample.temperature === null ? t("mapAdv.notCollected", "No recogido") : `${sample.temperature}°C`}</strong>
          </div>
          <div className="popup-row">
            <span>💧 {t("mapAdv.humidity")}:</span>{" "}
            <strong>{sample.humidity === null ? t("mapAdv.notCollected", "No recogido") : `${sample.humidity}%`}</strong>
          </div>
          <div className="popup-row">
            <span>☀️ {t("mapAdv.rad")}:</span>{" "}
            <strong>{sample.radiation === null ? t("mapAdv.notCollected", "No recogido") : `${sample.radiation} W`}</strong>
          </div>

          <hr className="popup-divider" />

          <div className="popup-nutrients">
            <div className="nutrient-item">
              <span className="nutrient-label n">N</span>
              <span className="nutrient-val">
                {sample.nitrogen === null ? "-" : sample.nitrogen}
              </span>
            </div>
            <div className="nutrient-item">
              <span className="nutrient-label p">P</span>
              <span className="nutrient-val">
                  {sample.phosphorus === null ? "-" : sample.phosphorus}
              </span>
            </div>
            <div className="nutrient-item">
              <span className="nutrient-label k">K</span>
              <span className="nutrient-val">
                  {sample.potassium === null ? "-" : sample.potassium}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

SampleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sample: PropTypes.object,
};

// --- Componente Principal ---

/**
 * Componente principal del visor del mapa.
 * Permite visualizar al robot, misiones, capas de datos, y delimitar zonas.
 * @returns {JSX.Element}
 */
function MapView() {
  const { t } = useTranslation();
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);
  const heading = useRobotStore((state) => state.system.heading);

  const agronomicData = useRobotStore((state) => {
    const data = state.agronomicData;
    return Array.isArray(data) ? data : [];
  });

  const safeZone = useRobotStore((state) => state.safeZone);
  const { setSafeZone, clearSafeZone } = useRobotStore();
  const { addToast } = useToast();

  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState(null);
  const [showZoneSummary, setShowZoneSummary] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("none");

  const initialPosition =
    position.lat && position.lon
      ? [position.lat, position.lon]
      : DEFAULT_COORDS;
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  const zoneStats = useMemo(
    () => calculateZoneStats(safeZone, agronomicData),
    [safeZone, agronomicData],
  );

  const handleStartDrawing = () => {
    setIsDrawingZone(true);
    setLastClickedCoords(null);
    setShowZoneSummary(false);
    addToast(t("mapAdv.drawInstructions"), "info");
  };

  const handleCancelDrawing = () => {
    setIsDrawingZone(false);
    addToast(t("mapAdv.drawCancelled"), "info");
  };

  const toggleDrawing = () => {
    if (isDrawingZone) {
      handleCancelDrawing();
    } else {
      handleStartDrawing();
    }
  };

  const handleZoneComplete = (polygonPoints) => {
    setSafeZone(polygonPoints);
    setIsDrawingZone(false);
    setShowZoneSummary(true);
    addToast(t("mapAdv.areaDelimited"), "success");
  };

  const handleClearZone = () => {
    clearSafeZone();
    setShowZoneSummary(false);
    addToast(t("mapAdv.limitsRemoved"), "info");
  };

  const handleMapClick = (latlng) => {
    setLastClickedCoords(latlng);
  };

  const handleMarkerClick = (sample) => {
    setSelectedSample(sample);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSample(null);
  };

  const isInsideZone = (lat, lon) => {
    if (!safeZone) return true;
    return isPointInPolygon([lat, lon], safeZone);
  };

  const handlePolygonClick = (e) => {
    L.DomEvent.stopPropagation(e);
    if (zoneStats) setShowZoneSummary(true);
  };

  return (
    <>
      <MapContainer
        center={initialPosition}
        zoom={18}
        className="map-view-container"
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name={t("mapAdv.layerSatellite")}>
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={t("mapAdv.layerStreets")}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {selectedMetric !== "none" && (
          <FieldDataOverlay metric={selectedMetric} />
        )}

        {safeZone && (
          <Polygon
            positions={safeZone}
            pathOptions={{
              color: "#22c55e",
              weight: 3,
              fillOpacity: 0.15,
              dashArray: "5, 10",
            }}
            eventHandlers={{ click: handlePolygonClick }}
          />
        )}

        <Marker
          position={BASE_STATION_COORDS}
          icon={baseStationIcon}
          zIndexOffset={-10}
        />

        <Marker
          position={initialPosition}
          icon={getRobotIcon(heading)}
          zIndexOffset={1000}
        />

        <Polyline
          pathOptions={{ color: "#06b6d4", weight: 4, opacity: 0.8 }}
          positions={pathCoords}
        />

        {agronomicData.map((sample, index) => {
          const isVisible = isInsideZone(
            Number(sample.lat),
            Number(sample.lon),
          );
          const markerKey = sample.id
            ? `sample-${sample.id}`
            : `sample-idx-${index}`;

          return (
            <SampleMarker
              key={markerKey}
              sample={sample}
              isVisible={isVisible}
              onClick={handleMarkerClick}
            />
          );
        })}

        <ZoneDrawer
          isDrawing={isDrawingZone}
          onZoneComplete={handleZoneComplete}
          onCancel={handleCancelDrawing}
        />
        <MapClickHandler
          onMapClick={handleMapClick}
          isDrawing={isDrawingZone}
        />

        <CenterButtonInternal />

        {lastClickedCoords && !isDrawingZone && (
          <div className="clicked-coords-display">
            <span style={{ color: "#ef4444", fontSize: "1.2em" }}>📍</span>
            Lat: {lastClickedCoords.lat.toFixed(5)} | Lon:{" "}
            {lastClickedCoords.lng.toFixed(5)}
          </div>
        )}

        <MapControlsOverlay
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          safeZone={safeZone}
          showZoneSummary={showZoneSummary}
          setShowZoneSummary={setShowZoneSummary}
          handleClearZone={handleClearZone}
          isDrawingZone={isDrawingZone}
          toggleDrawing={toggleDrawing}
        />

        {showZoneSummary && zoneStats && (
          <ZoneSummaryPanel
            zoneStats={zoneStats}
            onClose={() => setShowZoneSummary(false)}
          />
        )}
      </MapContainer>

      <SampleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        sample={selectedSample}
      />
    </>
  );
}

export default MapView;