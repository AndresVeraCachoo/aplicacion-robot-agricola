// src/features/dashboard/components/MapView.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useRobotStore } from "../../../store/robotStore";
import "./MapView.css";

function MapView() {
  // 1. Leemos la posición y el historial desde el estado global
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);

  // Leaflet usa [lat, lon]
  const currentPosition = [position.lat, position.lon];

  // Leaflet necesita un array de arrays [lat, lon]
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  return (
    // 2. Reemplazamos el placeholder por el MapContainer
    // Le damos una altura fija en el CSS
    <MapContainer
      center={currentPosition}
      zoom={18}
      className="map-view-container"
    >
      {/* 3. Capa de teselas del mapa (usamos OpenStreetMap) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 4. El marcador del robot */}
      <Marker position={currentPosition} />

      {/* 5. El historial de ruta (el rastro) */}
      <Polyline pathOptions={{ color: "blue" }} positions={pathCoords} />
    </MapContainer>
  );
}

export default MapView;
