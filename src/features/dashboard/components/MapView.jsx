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

import { useRobotStore } from "../../../store/robotStore.js";
import Modal from "../../../components/Modal.jsx";
import { useToast } from "../../../context/ToastContext.jsx";
import FieldDataOverlay from "./FieldDataOverlay.jsx";
import "./MapView.css";

// --- Funciones Auxiliares ---

const isPointInPolygon = (point, vs) => {
  const x = point[0],
    y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
      yi = vs[i][1];
    const xj = vs[j][0],
      yj = vs[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const getColorByPH = (phVal) => {
  const ph = Number(phVal);
  if (ph < 6) return "#ef4444";
  if (ph > 7.5) return "#3b82f6";
  return "#22c55e";
};

// --- Subcomponentes ---

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
      if (e.key === "Escape" && isDrawing) {
        onCancel();
      }
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
        pathOptions={{ color: "orange", dashArray: "5, 5", weight: 3 }}
      />
      {points.map((p, i) => (
        <CircleMarker
          key={`point-${p[0]}-${p[1]}`}
          center={p}
          radius={5}
          pathOptions={{
            color: i === 0 ? "red" : "orange",
            fillColor: "white",
            fillOpacity: 1,
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
      if (!isDrawing) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

MapClickHandler.propTypes = {
  onMapClick: PropTypes.func.isRequired,
  isDrawing: PropTypes.bool.isRequired,
};

function CenterButtonInternal() {
  const map = useMap();
  const position = useRobotStore((state) => state.position);

  const centerView = () => {
    if (position.lat && position.lon) {
      const currentPosition = [position.lat, position.lon];
      map.setView(currentPosition, 18);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        centerView();
      }}
      className="center-map-button"
      title="Centrar en el robot"
    >
      <span style={{ fontSize: "1.2em" }}>🎯</span>
    </button>
  );
}

// --- Componente Principal ---

function MapView() {
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

  // NUEVO ESTADO PARA EL MAPA DE CALOR
  const [selectedMetric, setSelectedMetric] = useState("none");

  const initialPosition =
    position.lat && position.lon
      ? [position.lat, position.lon]
      : [42.3525, -3.6845];
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  const robotIcon = L.divIcon({
    html: `<img src="/robot-arrow.svg" style="transform: rotate(${
      heading || 0
    }deg); width: 100%; height: 100%;" />`,
    className: "robot-marker-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const zoneStats = useMemo(() => {
    if (!safeZone || agronomicData.length === 0) return null;
    const pointsInZone = agronomicData.filter(
      (p) =>
        p.lat &&
        p.lon &&
        isPointInPolygon([Number(p.lat), Number(p.lon)], safeZone),
    );
    if (pointsInZone.length === 0) return null;
    const sum = pointsInZone.reduce(
      (acc, p) => ({
        ph: acc.ph + Number(p.ph),
        hum: acc.hum + Number(p.humedad),
        temp: acc.temp + Number(p.temperatura_suelo),
        n: acc.n + Number(p.nitrogeno),
        p: acc.p + Number(p.fosforo),
        k: acc.k + Number(p.potasio),
      }),
      { ph: 0, hum: 0, temp: 0, n: 0, p: 0, k: 0 },
    );
    const count = pointsInZone.length;
    return {
      count,
      avgPh: (sum.ph / count).toFixed(1),
      avgHum: (sum.hum / count).toFixed(0),
      avgTemp: (sum.temp / count).toFixed(1),
      avgN: (sum.n / count).toFixed(0),
      avgP: (sum.p / count).toFixed(0),
      avgK: (sum.k / count).toFixed(0),
    };
  }, [safeZone, agronomicData]);

  const handleStartDrawing = () => {
    setIsDrawingZone(true);
    setLastClickedCoords(null);
    setShowZoneSummary(false);
    addToast(
      "Haz clic para añadir vértices. Clic en el punto rojo para cerrar.",
      "info",
    );
  };

  const handleCancelDrawing = () => {
    setIsDrawingZone(false);
    addToast("Delimitación cancelada.", "info");
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
    addToast("Área delimitada.", "success");
  };

  const handleClearZone = () => {
    clearSafeZone();
    setShowZoneSummary(false);
    addToast("Límites eliminados.", "info");
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

  return (
    <>
      <MapContainer
        center={initialPosition}
        zoom={18}
        className="map-view-container"
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Calles">
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* CAPA DE MAPA DE CALOR (INTERPOLACIÓN) */}
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
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                if (zoneStats) setShowZoneSummary(true);
              },
            }}
          />
        )}

        <Marker position={initialPosition} icon={robotIcon} />
        <Polyline
          pathOptions={{ color: "cyan", weight: 3, opacity: 0.7 }}
          positions={pathCoords}
        />

        {agronomicData.map((sample, index) => {
          if (!sample.lat || !sample.lon) return null;
          const isVisible = isInsideZone(
            Number(sample.lat),
            Number(sample.lon),
          );
          const markerKey = sample.id
            ? `sample-${sample.id}`
            : `sample-idx-${index}`;

          return (
            <CircleMarker
              key={markerKey}
              center={[sample.lat, sample.lon]}
              radius={isVisible ? 6 : 2}
              pathOptions={{
                color: "white",
                weight: 1,
                fillColor: getColorByPH(sample.ph),
                fillOpacity: isVisible ? 0.9 : 0.1,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (isVisible) handleMarkerClick(sample);
                },
              }}
            >
              {isVisible && (
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <span>pH: {sample.ph}</span>
                </Tooltip>
              )}
            </CircleMarker>
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
      </MapContainer>

      {lastClickedCoords && !isDrawingZone && (
        <div className="clicked-coords-display">
          <span style={{ color: "#ef4444", marginRight: "5px" }}>📍</span>
          Lat: {lastClickedCoords.lat.toFixed(5)} | Lon:{" "}
          {lastClickedCoords.lng.toFixed(5)}
        </div>
      )}

      {/* --- BOTONES Y CONTROLES DEL MAPA --- */}
      <div className="map-controls-overlay">
        {/* NUEVO: SELECTOR DE MAPA DE CALOR INTEGRADO AL DISEÑO */}
        <select
          className="map-btn"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          title="Seleccionar Mapa de Calor"
          style={{
            outline: "none",
            cursor: "pointer",
            WebkitAppearance: "none",
            appearance: "auto",
          }}
        >
          <option value="none">🗺️ Capa: Desactivada</option>
          <option value="humedad">💧 Capa: Humedad</option>
          <option value="ph">🧪 Capa: pH</option>
          <option value="temperatura_suelo">🌡️ Capa: Temperatura</option>
        </select>

        {safeZone ? (
          <div className="zone-active-controls">
            <button
              type="button"
              className="map-btn info"
              onClick={() => setShowZoneSummary(!showZoneSummary)}
              title="Ver Resumen de Datos"
            >
              {showZoneSummary ? "👁️ Ocultar Datos" : "📊 Ver Datos"}
            </button>
            <button
              type="button"
              className="map-btn danger"
              onClick={handleClearZone}
              title="Borrar Límite"
            >
              🗑️ Borrar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`map-btn ${isDrawingZone ? "active" : ""}`}
            onClick={toggleDrawing}
            title="Delimitar Área"
          >
            {isDrawingZone ? "❌ Cancelar" : "🌾 Delimitar Área"}
          </button>
        )}
      </div>

      {showZoneSummary && zoneStats && (
        <div className="zone-summary-panel">
          <div className="summary-header">
            <h4>Resumen de Área</h4>
            <button type="button" onClick={() => setShowZoneSummary(false)}>
              &times;
            </button>
          </div>
          <div className="summary-metric main">
            <span className="label">pH Promedio</span>
            <span
              className="value"
              style={{ color: getColorByPH(zoneStats.avgPh) }}
            >
              {zoneStats.avgPh}
            </span>
          </div>
          <div className="summary-grid">
            <div className="metric-box">
              <span>Humedad</span>
              <strong>{zoneStats.avgHum}%</strong>
            </div>
            <div className="metric-box">
              <span>Temp.</span>
              <strong>{zoneStats.avgTemp}°C</strong>
            </div>
            <div className="metric-box full">
              <span>Nutrientes (Promedio)</span>
              <div className="mini-npk">
                <span className="n">N: {zoneStats.avgN}</span>
                <span className="p">P: {zoneStats.avgP}</span>
                <span className="k">K: {zoneStats.avgK}</span>
              </div>
            </div>
          </div>
          <div className="summary-footer">
            {zoneStats.count} muestras analizadas
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          selectedSample ? `Muestra #${selectedSample.id || "N/A"}` : "Detalle"
        }
      >
        {selectedSample && (
          <div className="sample-popup-content">
            <div className="popup-header">
              <div className="popup-kpi">
                <span className="label">pH</span>
                <span
                  className="value"
                  style={{ color: getColorByPH(selectedSample.ph) }}
                >
                  {selectedSample.ph}
                </span>
              </div>
              <div className="popup-date">
                {selectedSample.timestamp
                  ? new Date(selectedSample.timestamp).toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="popup-grid">
              <div className="popup-row">
                <span>🌡️ Suelo:</span>{" "}
                <strong>{selectedSample.temperatura_suelo}°C</strong>
              </div>
              <div className="popup-row">
                <span>💧 Humedad:</span>{" "}
                <strong>{selectedSample.humedad}%</strong>
              </div>
              <div className="popup-row">
                <span>☀️ Rad:</span>{" "}
                <strong>{selectedSample.radiacion_solar} W</strong>
              </div>

              <hr className="popup-divider" />

              <div className="popup-nutrients">
                <div className="nutrient-item">
                  <span className="nutrient-label n">N</span>
                  <span className="nutrient-val">
                    {selectedSample.nitrogeno}
                  </span>
                </div>
                <div className="nutrient-item">
                  <span className="nutrient-label p">P</span>
                  <span className="nutrient-val">{selectedSample.fosforo}</span>
                </div>
                <div className="nutrient-item">
                  <span className="nutrient-label k">K</span>
                  <span className="nutrient-val">{selectedSample.potasio}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default MapView;
