// src/features/control/ControlMap.jsx
import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
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

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const calculateGeodesicArea = (latLngs) => {
  const EARTH_RADIUS = 6378137;
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
    area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2;
  }
  return Math.abs(area);
};

// Añadimos 't' como parámetro para poder traducir el Área
const updateAreaTooltip = (layer, t) => {
  if (!(layer instanceof L.Polygon)) return;

  const latlngs = layer.getLatLngs();
  let mainArea = 0;
  let holesArea = 0;
  const shapes = Array.isArray(latlngs[0]) ? latlngs : [latlngs];

  shapes.forEach((ring, index) => {
    const ringArea = calculateGeodesicArea(ring);
    if (index === 0) mainArea = ringArea;
    else holesArea += ringArea;
  });

  const finalArea = mainArea - holesArea;

  // Usamos un fallback seguro por si 't' no se pasa correctamente al inicio
  const areaLabel = t ? t("control.area") : "Area";

  let text =
    finalArea < 10000
      ? `${areaLabel}: ${Math.round(finalArea).toLocaleString()} m²`
      : `${areaLabel}: ${(finalArea / 10000).toFixed(2)} ha`;

  if (layer.getTooltip()) {
    layer.setTooltipContent(text);
  } else {
    layer.bindTooltip(text, {
      permanent: true,
      direction: "center",
      className: "area-tooltip",
    });
  }
};

const GeomanControls = ({ ignoreClickRef }) => {
  const { t, i18n } = useTranslation();
  const map = useMap();
  const { setSafeZone, clearSafeZone, safeZone } = useRobotStore();
  const isZoneLoadedRef = useRef(false);

  const handleZoneUpdate = useCallback(
    (layer) => {
      if (layer instanceof L.Polygon) {
        updateAreaTooltip(layer, t);
        const latlngs = layer.getLatLngs();
        const outerRing = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
        const formattedZone = outerRing.map((p) => [p.lat, p.lng]);
        setSafeZone(formattedZone);
      }
    },
    [setSafeZone, t],
  );

  useEffect(() => {
    if (!map) return;

    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
      hintlineStyle: { color: "#3388ff", dashArray: [5, 5] },
    });

    // Cambia el idioma de Geoman según nuestro i18n
    const currentLang = i18n.language.startsWith("es") ? "es" : "en";
    map.pm.setLang(currentLang);

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
      cutPolygon: true,
      rotateMode: true,
      removalMode: true,
    });

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

    map.on("pm:create", (e) => {
      const { layer } = e;
      if (layer.pm?.hasSelfIntersection()) {
        alert(t("control.polygonError"));
        map.removeLayer(layer);
        return;
      }
      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer)
          map.removeLayer(l);
      });

      handleZoneUpdate(layer);
      layer.on("pm:edit", (evt) => handleZoneUpdate(evt.target));
      layer.on("pm:dragend", (evt) => handleZoneUpdate(evt.target));
      layer.on("pm:rotateend", (evt) => handleZoneUpdate(evt.target));
      layer.on("pm:cut", (evt) => handleZoneUpdate(evt.layer));
    });

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
  }, [map, clearSafeZone, ignoreClickRef, handleZoneUpdate, t, i18n.language]);

  useEffect(() => {
    if (!map || !safeZone || safeZone.length === 0 || isZoneLoadedRef.current)
      return;

    map.eachLayer((l) => {
      if (l instanceof L.Polygon && !l._pmTempLayer) map.removeLayer(l);
    });

    const polygon = L.polygon(safeZone, { color: "#3388ff" }).addTo(map);
    updateAreaTooltip(polygon, t);

    polygon.on("pm:edit", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:dragend", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:rotateend", (e) => handleZoneUpdate(e.target));
    polygon.on("pm:cut", (e) => handleZoneUpdate(e.layer));

    isZoneLoadedRef.current = true;
  }, [map, safeZone, handleZoneUpdate, t]);

  return null;
};

GeomanControls.propTypes = {
  ignoreClickRef: PropTypes.shape({ current: PropTypes.bool }).isRequired,
};

const createRobotArrowIcon = (heading) => {
  return new L.DivIcon({
    className: "robot-arrow-icon",
    html: `
            <div style="transform: rotate(${heading}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s linear;">
                <img src="/robot-arrow.svg" alt="Robot" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" />
            </div>
        `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -20],
  });
};

const ClickHandler = ({ ignoreClickRef }) => {
  const { navigateToPoint, queueNavigationPoint, system } = useRobotStore();
  const controlMode = system.mode;

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
        if (e.originalEvent.shiftKey) {
          queueNavigationPoint(e.latlng.lat, e.latlng.lng);
        } else {
          navigateToPoint(e.latlng.lat, e.latlng.lng);
        }
      }
    },
  });
  return null;
};

ClickHandler.propTypes = {
  ignoreClickRef: PropTypes.shape({ current: PropTypes.bool }).isRequired,
};

const CenterButton = () => {
  const { t } = useTranslation();
  const map = useMap();
  const position = useRobotStore((state) => state.position);

  const centerView = () => {
    if (position.lat && position.lon) {
      const currentPosition = [position.lat, position.lon];
      map.setView(currentPosition, 19);
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
      title={t("control.centerRobot")}
    >
      <span style={{ fontSize: "1.2em" }}>🎯</span>
    </button>
  );
};

const ControlMap = () => {
  const { t } = useTranslation();
  const { position, navTarget, navQueue, pathHistory, system } =
    useRobotStore();
  const ignoreClickRef = useRef(false);

  if (!position.lat)
    return <div className="map-loading">{t("control.loadingGPS")}</div>;

  const fullQueuePath = [];
  if (navTarget) {
    fullQueuePath.push(
      [position.lat, position.lon],
      [navTarget.lat, navTarget.lon],
    );
    navQueue.forEach((p) => fullQueuePath.push([p.lat, p.lon]));
  }

  return (
    <div className="control-map-wrapper">
      <MapContainer
        center={[position.lat, position.lon]}
        zoom={19}
        scrollWheelZoom={true}
        className="control-leaflet-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        <ClickHandler ignoreClickRef={ignoreClickRef} />
        <GeomanControls ignoreClickRef={ignoreClickRef} />

        <CenterButton />

        <Marker
          position={[position.lat, position.lon]}
          icon={createRobotArrowIcon(system.heading || 0)}
        >
          <Popup>
            AgriRobot
            <br />
            {t("control.heading")}: {Math.floor(system.heading)}°
          </Popup>
        </Marker>

        <Polyline
          positions={pathHistory}
          color="yellow"
          weight={2}
          opacity={0.6}
        />

        {fullQueuePath.length > 0 && (
          <>
            <Polyline
              positions={fullQueuePath}
              color="#00ffcc"
              weight={3}
              dashArray="10, 10"
              opacity={0.8}
            />
            {navQueue.map((p, idx) => (
              <Marker
                key={`nav-queue-${p.lat}-${p.lon}-${idx}`}
                position={[p.lat, p.lon]}
                opacity={0.7}
              >
                <Popup>
                  {t("control.queuePoint")} #{idx + 1}
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {navTarget && (
          <Marker position={[navTarget.lat, navTarget.lon]}>
            <Popup>{t("control.currentTarget")}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default ControlMap;
