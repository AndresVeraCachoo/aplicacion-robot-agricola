// src/features/dashboard/components/MapView.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useRobotStore } from "../../../store/robotStore";
import "./MapView.css";

// Necesitamos importar 'L' de leaflet para el icono personalizado
import L from "leaflet";

function MapView() {
  const position = useRobotStore((state) => state.position);
  const pathHistory = useRobotStore((state) => state.pathHistory);

  // Asumimos que tendremos un dato de "heading" (dirección en grados) en el futuro
  // Por ahora, lo simulamos:
  const heading = useRobotStore((state) => state.system.heading) || 45; // Grados (0-360)

  const currentPosition = [position.lat, position.lon];
  const pathCoords = pathHistory.map((p) => [p.lat, p.lon]);

  // --- Icono Personalizado ---
  // (Puedes usar un SVG o una imagen PNG)
  // Necesitarás crear un icono de flecha simple (ej. arrow.svg) en tu carpeta /public
  const robotIcon = L.icon({
    iconUrl: "/arrow.svg", // Ruta a tu icono en la carpeta /public
    iconSize: [25, 25], // Tamaño del icono
    iconAnchor: [12, 12], // Punto del icono que corresponde a la posición
  });

  return (
    <MapContainer
      center={currentPosition}
      zoom={18}
      className="map-view-container"
    >
      {/* --- Cambio a Satélite --- */}
      <TileLayer
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {/* --- Marcador con Icono y Rotación --- */}
      <Marker
        position={currentPosition}
        icon={robotIcon}
        // Leaflet no soporta rotación directamente en el Marker estándar.
        // Para esto, necesitaríamos 'leaflet-rotatedmarker' o crear un componente personalizado.
        // Por ahora, solo usamos el icono de flecha.
      />

      <Polyline pathOptions={{ color: "cyan" }} positions={pathCoords} />

      {/* --- Futuro: Marcadores de Datos --- */}
      {}
    </MapContainer>
  );
}

export default MapView;
