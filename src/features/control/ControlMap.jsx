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

// Importación de Geoman
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

// Fix para iconos por defecto de Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- FUNCIÓN AUXILIAR: CÁLCULO DE ÁREA GEODÉSICA (m2) ---
// Calcula el área esférica aproximada sin dependencias externas
const calculateGeodesicArea = (latLngs) => {
  const EARTH_RADIUS = 6378137; // Metros
  let area = 0;

  if (latLngs.length > 2) {
    for (let i = 0; i < latLngs.length; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[(i + 1) % latLngs.length];
      area +=
        (p2.lng - p1.lng) *
        (Math.PI / 180) *
        (2 +
          Math.sin(p1.lat * (Math.PI / 180)) +
          Math.sin(p2.lat * (Math.PI / 180)));
    }
    area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2.0;
  }
  return Math.abs(area);
};

// Función para formatear y mostrar el área en la capa
const updateAreaTooltip = (layer) => {
  if (!(layer instanceof L.Polygon)) return;

  const latlngs = layer.getLatLngs();
  // Manejo de polígonos simples vs polígonos con huecos (Anillos)
  let mainArea = 0;
  let holesArea = 0;

  // Leaflet devuelve:
  // - Polígono simple: [ [lat,lon], ... ] -> Array de LatLng
  // - Polígono complejo: [ [ [lat,lon], ... ], [ [lat,lon], ... ] ] -> Array de Arrays de LatLng (El primero es exterior, resto son huecos)

  // Normalizamos para cálculo
  const shapes = Array.isArray(latlngs[0]) ? latlngs : [latlngs];

  shapes.forEach((ring, index) => {
    // Convertimos objetos LatLng a estructura simple si es necesario
    // Ring suele ser un array de objetos LatLng
    const ringArea = calculateGeodesicArea(ring);
    if (index === 0) {
      mainArea = ringArea;
    } else {
      holesArea += ringArea;
    }
  });

  const finalArea = mainArea - holesArea;

  // Formatear texto
  let text = "";
  if (finalArea < 10000) {
    text = `Area: ${Math.round(finalArea).toLocaleString()} m²`;
  } else {
    text = `Area: ${(finalArea / 10000).toFixed(2)} ha`;
  }

  // Vincular o actualizar tooltip permanente en el centro
  if (!layer.getTooltip()) {
    layer.bindTooltip(text, {
      permanent: true,
      direction: "center",
      className: "area-tooltip",
    });
  } else {
    layer.setTooltipContent(text);
  }
};

// --- COMPONENTE GEOMAN CONTROLS ---
const GeomanControls = ({ ignoreClickRef }) => {
  const map = useMap();
  const { setSafeZone, clearSafeZone, safeZone } = useRobotStore();
  const isZoneLoadedRef = useRef(false);

  // Función estable para actualizar el store
  const handleZoneUpdate = useCallback(
    (layer) => {
      if (layer instanceof L.Polygon) {
        updateAreaTooltip(layer); // Actualizar visualización de área

        const latlngs = layer.getLatLngs();
        // Para el backend, simplificamos enviando solo el anillo exterior por ahora
        // (Si quisieras soportar huecos en backend, habría que enviar la estructura compleja)
        const outerRing = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
        const formattedZone = outerRing.map((p) => [p.lat, p.lng]);

        setSafeZone(formattedZone);
      }
    },
    [setSafeZone]
  );

  // EFECTO DE CONFIGURACIÓN
  useEffect(() => {
    if (!map) return;

    // 1. Opciones Globales (Snapping + Restricciones)
    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false, // ¡Importante para la lógica de ruta!
      hintlineStyle: { color: "#3388ff", dashArray: [5, 5] },
    });

    map.pm.setLang("es");

    // 2. Barra de Herramientas
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: true, // Habilitar Arrastre
      cutPolygon: true, // Habilitar Corte (Huecos)
      rotateMode: true, // Habilitar Rotación
      removalMode: true,
    });

    // Manejo de bloqueos de click
    map.on("pm:drawstart", () => {
      ignoreClickRef.current = true;
    });
    map.on("pm:drawend", () => {
      setTimeout(() => {
        ignoreClickRef.current = false;
      }, 300);
    });
    map.on("pm:globaldragmodetoggled", (e) => {
      ignoreClickRef.current = e.enabled;
    });
    map.on("pm:globalrotatemodetoggled", (e) => {
      ignoreClickRef.current = e.enabled;
    });

    // EVENTO: CREAR
    map.on("pm:create", (e) => {
      const { layer } = e;

      // Validación de intersección
      if (layer.pm && layer.pm.hasSelfIntersection()) {
        alert("El polígono no puede cruzarse a sí mismo.");
        map.removeLayer(layer);
        return;
      }

      // Borrar anteriores
      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });

      handleZoneUpdate(layer);

      // Eventos de modificación
      layer.on("pm:edit", (evt) => handleZoneUpdate(evt.target));
      layer.on("pm:dragend", (evt) => handleZoneUpdate(evt.target));
      layer.on("pm:rotateend", (evt) => handleZoneUpdate(evt.target)); // Nuevo evento rotación
      layer.on("pm:cut", (evt) => {
        // Nuevo evento corte
        // Al cortar, la capa original cambia (layer)
        handleZoneUpdate(evt.layer);
      });
    });

    // EVENTO: BORRAR
    map.on("pm:remove", () => {
      const layers = map.pm.getGeomanLayers();
      const hasPolygons = layers.some((l) => l instanceof L.Polygon);
      if (!hasPolygons) {
        clearSafeZone();
        isZoneLoadedRef.current = false;
      }
    });

    return () => {
      map.pm.removeControls();
      map.off("pm:create");
      map.off("pm:remove");
      map.off("pm:drawstart");
      map.off("pm:drawend");
      map.off("pm:globaldragmodetoggled");
      map.off("pm:globalrotatemodetoggled");
    };
  }, [map, clearSafeZone, ignoreClickRef, handleZoneUpdate]);

  // EFECTO DE RESTAURACIÓN (Pintar zona inicial)
  useEffect(() => {
    if (!map || !safeZone || safeZone.length === 0 || isZoneLoadedRef.current)
      return;

    map.eachLayer((l) => {
      if (l instanceof L.Polygon && !l._pmTempLayer) map.removeLayer(l);
    });

    const polygon = L.polygon(safeZone, { color: "#3388ff" }).addTo(map);

    // Calcular área inicial
    updateAreaTooltip(polygon);

    // Reconectar eventos
    polygon.on("pm:edit", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:dragend", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:rotateend", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:cut", (e) => handleZoneUpdate(e.layer));

    isZoneLoadedRef.current = true;
  }, [map, safeZone, handleZoneUpdate]);

  return null;
};

// --- ICONO ROBOT ---
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

// --- CLICK HANDLER ---
const ClickHandler = ({ ignoreClickRef }) => {
  const { navigateToPoint, controlMode } = useRobotStore();

  useMapEvents({
    click(e) {
      if (ignoreClickRef.current) return;

      const isDrawing = e.target.pm?.globalDrawModeEnabled?.();
      const isEditing = e.target.pm?.globalEditModeEnabled?.();
      const isDragging = e.target.pm?.globalDragModeEnabled?.();
      const isRotating = e.target.pm?.globalRotateModeEnabled?.();

      if (
        controlMode !== "MANUAL" &&
        !isDrawing &&
        !isEditing &&
        !isDragging &&
        !isRotating
      ) {
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
