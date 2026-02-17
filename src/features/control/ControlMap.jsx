// src/features/control/ControlMap.jsx
import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRobotStore } from "../../store/robotStore";
import "./ControlMap.css";

// Fix para iconos por defecto de Leaflet (para el target y otros marcadores estándar)
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- FUNCIÓN PARA CREAR LA FLECHA ROTATORIA ---
const createRobotArrowIcon = (heading) => {
  return new L.DivIcon({
    className: "robot-arrow-icon", // Clase CSS para limpiar estilos
    html: `
            <div style="
                transform: rotate(${heading}deg);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s linear; /* Rotación suave */
            ">
                <img 
                    src="/robot-arrow.svg" 
                    alt="Robot" 
                    style="
                        width: 100%; 
                        height: 100%; 
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                    " 
                />
            </div>
        `,
    iconSize: [30, 30],
    iconAnchor: [15, 15], // MITAD del tamaño (Centro exacto de rotación)
    popupAnchor: [0, -20], // Donde aparece el popup respecto al centro
  });
};

// Componente para manejar clics en el mapa
const ClickHandler = () => {
  const { navigateToPoint, controlMode } = useRobotStore();

  useMapEvents({
    click(e) {
      // Permitir navegación solo si NO estamos en modo manual estricto
      if (controlMode !== "MANUAL") {
        navigateToPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const ControlMap = () => {
  // Obtenemos 'system' para leer el 'heading' (rumbo) actual
  const { position, navTarget, pathHistory, system } = useRobotStore();

  // Si no hay posición GPS, mostramos mensaje de carga
  if (!position.lat) return <div className="map-loading">Cargando GPS...</div>;

  return (
    <div className="control-map-wrapper">
      <MapContainer
        center={[position.lat, position.lon]}
        zoom={19}
        scrollWheelZoom={true}
        className="control-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        <ClickHandler />

        {/* --- ROBOT: Marcador con la flecha dinámica --- */}
        <Marker
          position={[position.lat, position.lon]}
          icon={createRobotArrowIcon(system.heading || 0)}
        >
          <Popup>
            <div style={{ textAlign: "center" }}>
              <strong>AgriRobot</strong>
              <br />
              Rumbo: {Math.floor(system.heading)}°
            </div>
          </Popup>
        </Marker>

        {/* RUTA HISTÓRICA (Estela amarilla) */}
        <Polyline
          positions={pathHistory}
          color="yellow"
          weight={2}
          opacity={0.6}
        />

        {/* OBJETIVO Y LÍNEA DE RUTA (Verde) */}
        {navTarget && (
          <>
            <Marker position={[navTarget.lat, navTarget.lon]}>
              <Popup>Destino</Popup>
            </Marker>
            <Polyline
              positions={[
                [position.lat, position.lon],
                [navTarget.lat, navTarget.lon],
              ]}
              color="#00ff00"
              dashArray="10, 10"
              weight={3}
            />
          </>
        )}
      </MapContainer>

      <div className="map-instructions">
        Modo: {system.mode} | Clic para navegar
      </div>
    </div>
  );
};

export default ControlMap;
