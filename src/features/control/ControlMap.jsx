// src/features/control/ControlMap.jsx
import React, { useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRobotStore } from "../../store/robotStore";
import "./ControlMap.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

// Fix para iconos por defecto
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENTE GEOMAN CONTROLS ---
const GeomanControls = ({ ignoreClickRef }) => {
  const map = useMap();
  const { setSafeZone, clearSafeZone, safeZone } = useRobotStore();
  const isZoneLoadedRef = useRef(false);

  // 1. Definimos la función de actualización con useCallback para que sea estable
  // y podamos usarla en las dependencias sin causar re-renders.
  const handleZoneUpdate = useCallback(
    (layer) => {
      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs();
        const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
        const formattedZone = coords.map((p) => [p.lat, p.lng]);
        setSafeZone(formattedZone);
      }
    },
    [setSafeZone]
  );

  // 2. EFECTO DE CONFIGURACIÓN (No depende de safeZone)
  // Este efecto configura las herramientas de dibujo y los eventos globales.
  // Al no incluir 'safeZone', no se reinicia cuando editas el polígono.
  useEffect(() => {
    if (!map) return;

    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setLang("es");

    // Bloqueo de clics durante el dibujo
    map.on("pm:drawstart", () => {
      ignoreClickRef.current = true;
    });

    map.on("pm:drawend", () => {
      setTimeout(() => {
        ignoreClickRef.current = false;
      }, 300);
    });

    // Evento al CREAR una zona nueva
    map.on("pm:create", (e) => {
      const { layer } = e;

      // Borrar zonas anteriores para mantener solo una
      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });

      handleZoneUpdate(layer);

      // Asignar listeners a la nueva capa
      layer.on("pm:edit", (editEvent) => handleZoneUpdate(editEvent.target));
      layer.on("pm:dragend", (dragEvent) => handleZoneUpdate(dragEvent.target));
    });

    // Evento al BORRAR
    map.on("pm:remove", () => {
      const layers = map.pm.getGeomanLayers();
      const hasPolygons = layers.some((l) => l instanceof L.Polygon);

      if (!hasPolygons) {
        clearSafeZone();
        isZoneLoadedRef.current = false; // Permitimos volver a cargar si fuera necesario
      }
    });

    return () => {
      map.pm.removeControls();
      map.off("pm:create");
      map.off("pm:remove");
      map.off("pm:drawstart");
      map.off("pm:drawend");
    };
  }, [map, clearSafeZone, ignoreClickRef, handleZoneUpdate]);

  // 3. EFECTO DE RESTAURACIÓN (Sí depende de safeZone)
  // Este efecto se encarga EXCLUSIVAMENTE de pintar el polígono guardado al iniciar.
  // Usa isZoneLoadedRef para asegurarse de que solo lo hace una vez.
  useEffect(() => {
    // Si ya cargamos la zona, o no hay datos, no hacemos nada.
    if (!map || !safeZone || safeZone.length === 0 || isZoneLoadedRef.current)
      return;

    // Limpieza de seguridad
    map.eachLayer((l) => {
      if (l instanceof L.Polygon && !l._pmTempLayer) map.removeLayer(l);
    });

    // Pintar el polígono desde el store
    const polygon = L.polygon(safeZone, { color: "#3388ff" }).addTo(map);

    // IMPORTANTE: Reconectar los eventos de edición al polígono restaurado
    polygon.on("pm:edit", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:dragend", (e) => handleZoneUpdate(e.target));

    // Marcamos como cargado para que futuras actualizaciones de 'safeZone'
    // (causadas por editar este mismo polígono) sean ignoradas por este efecto.
    isZoneLoadedRef.current = true;
  }, [map, safeZone, handleZoneUpdate]);

  return null;
};

// --- ICONO ROBOT (Sin cambios) ---
const createRobotArrowIcon = (heading) => {
  return new L.DivIcon({
    className: "robot-arrow-icon",
    html: `
            <div style="
                transform: rotate(${heading}deg);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s linear;
            ">
                <img src="/robot-arrow.svg" alt="Robot" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" />
            </div>
        `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -20],
  });
};

// --- CLICK HANDLER (Sin cambios) ---
const ClickHandler = ({ ignoreClickRef }) => {
  const { navigateToPoint, controlMode } = useRobotStore();

  useMapEvents({
    click(e) {
      if (ignoreClickRef.current) return;

      const isDrawing = e.target.pm?.globalDrawModeEnabled?.();
      const isEditing = e.target.pm?.globalEditModeEnabled?.();

      if (controlMode !== "MANUAL" && !isDrawing && !isEditing) {
        navigateToPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const ControlMap = () => {
  const { position, navTarget, pathHistory, system } = useRobotStore();
  const ignoreClickRef = useRef(false);

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

        <ClickHandler ignoreClickRef={ignoreClickRef} />
        <GeomanControls ignoreClickRef={ignoreClickRef} />

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

        <Polyline
          positions={pathHistory}
          color="yellow"
          weight={2}
          opacity={0.6}
        />

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
              color="cyan"
              dashArray="5, 10"
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default ControlMap;
