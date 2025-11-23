// src/features/dashboard/components/MapView.jsx
import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  LayersControl,
  useMap,
  useMapEvents,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import { useRobotStore } from "../../../store/robotStore";
import Modal from "../../../components/Modal";
import "./MapView.css";

// --- Subcomponentes ---

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function CenterMapButton() {
  const map = useMap();
  const position = useRobotStore((state) => state.position);

  const centerView = () => {
    if (position.lat && position.lon) {
      const currentPosition = [position.lat, position.lon];
      map.setView(currentPosition, map.getZoom());
    }
  };

  return (
    <button
      onClick={centerView}
      className="center-map-button leaflet-control"
      title="Centrar en el robot"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="#333"
        width="18px"
        height="18px"
      >
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    </button>
  );
}

// --- Componente Principal ---

function MapView() {
  // Estados del Robot
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);
  const heading = useRobotStore((state) => state.system.heading);

  // Datos Históricos para los puntos
  // Aseguramos que sea un array
  const agronomicData = useRobotStore((state) => {
    const data = state.agronomicData;
    return Array.isArray(data) ? data : [];
  });

  // Estados Locales
  const [lastClickedCoords, setLastClickedCoords] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Configuración Inicial
  const initialPosition =
    position.lat && position.lon
      ? [position.lat, position.lon]
      : [42.3525, -3.6845];
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  // Icono del Robot
  const robotIcon = L.divIcon({
    html: `<img src="/robot-arrow.svg" style="transform: rotate(${
      heading || 0
    }deg); width: 100%; height: 100%;" />`,
    className: "robot-marker-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  // Helper Color pH
  const getColorByPH = (phVal) => {
    const ph = Number(phVal);
    if (ph < 6.0) return "#ef4444"; // Rojo
    if (ph > 7.5) return "#3b82f6"; // Azul
    return "#22c55e"; // Verde
  };

  // Manejadores
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

  return (
    <>
      <MapContainer
        center={initialPosition}
        zoom={18}
        className="map-view-container"
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

        {/* 1. Marcador del Robot */}
        {position.lat && position.lon && (
          <Marker position={[position.lat, position.lon]} icon={robotIcon} />
        )}

        {/* 2. Rastro del Robot */}
        <Polyline
          pathOptions={{ color: "cyan", weight: 2, opacity: 0.6 }}
          positions={pathCoords}
        />

        {/* 3. Puntos de Muestreo (Histórico) */}
        {agronomicData.map((sample, index) => {
          if (!sample.lat || !sample.lon) return null;
          const markerKey = sample.id || `sample-${index}`;

          return (
            <CircleMarker
              key={markerKey}
              center={[sample.lat, sample.lon]}
              radius={6}
              pathOptions={{
                color: "white",
                weight: 1,
                fillColor: getColorByPH(sample.ph),
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e); // Evita que el clic pase al mapa
                  handleMarkerClick(sample);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <span>pH: {sample.ph}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        <MapClickHandler onMapClick={handleMapClick} />
        <CenterMapButton />

        {/* Coordenadas Clicadas */}
        {lastClickedCoords && (
          <div className="clicked-coords-display leaflet-control">
            Lat: {lastClickedCoords.lat.toFixed(6)}, Lon:{" "}
            {lastClickedCoords.lng.toFixed(6)}
          </div>
        )}
      </MapContainer>

      {/* 4. Modal de Detalle de Muestra */}
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
                {new Date(selectedSample.timestamp).toLocaleString()}
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
              <hr />
              <div className="popup-nutrients">
                <span style={{ color: "#0284c7" }}>
                  N: {selectedSample.nitrogeno}
                </span>
                <span style={{ color: "#d97706" }}>
                  P: {selectedSample.fosforo}
                </span>
                <span style={{ color: "#7c3aed" }}>
                  K: {selectedSample.potasio}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default MapView;
