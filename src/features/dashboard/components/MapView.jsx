// src/features/dashboard/components/MapView.jsx
import React, { useState } from "react"; // Importamos useState
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  LayersControl, // Para cambiar capas
  // Ya no necesitamos FeatureGroup ni Circle
  useMap, // Hook para acceder al mapa (botón centrar)
  useMapEvents, // Hook para eventos del mapa (clics)
} from "react-leaflet";
import { useRobotStore } from "../../../store/robotStore";
import "./MapView.css";
import L from "leaflet";

// Componente para manejar los clics en el mapa
// Ahora recibe una función para actualizar el estado del padre
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      // Llama a la función pasada por prop con las coordenadas
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Componente para el botón de centrado (sin cambios aquí)
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

// Componente principal del Mapa
function MapView() {
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);
  const heading = useRobotStore((state) => state.system.heading);

  // Estado para guardar las últimas coordenadas clicadas
  const [lastClickedCoords, setLastClickedCoords] = useState(null);

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

  // Función que se pasa al MapClickHandler
  const handleMapClick = (latlng) => {
    setLastClickedCoords(latlng);
  };

  return (
    <MapContainer
      center={initialPosition}
      zoom={18}
      className="map-view-container"
    >
      <LayersControl position="topright">
        {/* Capas Base (sin cambios) */}
        <LayersControl.BaseLayer checked name="Satélite">
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS..."
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Calles">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* YA NO HAY CAPA DE SUPERPOSICIÓN DE ZONA SEGURA */}
      </LayersControl>

      {position.lat && position.lon && (
        <Marker position={[position.lat, position.lon]} icon={robotIcon} />
      )}

      <Polyline pathOptions={{ color: "cyan" }} positions={pathCoords} />

      {/* Pasamos la función handleMapClick al MapClickHandler */}
      <MapClickHandler onMapClick={handleMapClick} />
      <CenterMapButton />

      {/* --- Muestra las coordenadas clicadas --- */}
      {lastClickedCoords && (
        <div className="clicked-coords-display leaflet-control">
          Lat: {lastClickedCoords.lat.toFixed(6)}, Lon:{" "}
          {lastClickedCoords.lng.toFixed(6)}
        </div>
      )}
    </MapContainer>
  );
}

export default MapView;
