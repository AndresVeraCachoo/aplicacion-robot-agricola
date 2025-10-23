// src/features/dashboard/components/MapView.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useRobotStore } from "../../../store/robotStore";
import "./MapView.css";
import L from "leaflet"; // Importamos L

function MapView() {
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);
  // Leemos la orientación desde el store
  const heading = useRobotStore((state) => state.system.heading);

  const currentPosition = [position.lat, position.lon];
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  // Creamos un DivIcon
  const robotIcon = L.divIcon({
    html: `<img src="/robot-arrow.svg" style="transform: rotate(${heading}deg); width: 100%; height: 100%;" />`,
    className: "robot-marker-icon", // Clase CSS para tamaño y centrado
    iconSize: [30, 30], // Tamaño del div
    iconAnchor: [15, 15], // Punto de anclaje (centro del icono)
  });

  return (
    <MapContainer
      center={currentPosition}
      zoom={18}
      className="map-view-container"
    >
      <TileLayer
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {/* Usamos el DivIcon */}
      <Marker position={currentPosition} icon={robotIcon} />

      <Polyline pathOptions={{ color: "cyan" }} positions={pathCoords} />
    </MapContainer>
  );
}

export default MapView;
