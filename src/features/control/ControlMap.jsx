// src/features/control/ControlMap.jsx
import React, { useEffect, useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRobotStore } from "../../store/robotStore";
import { useMissionStore } from "../../store/missionStore";
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

// Funciones Matemáticas
const calculateGeodesicArea = (latLngs) => {
  const EARTH_RADIUS = 6378137;
  let area = 0;
  if (latLngs.length > 2) {
    for (let i = 0; i < latLngs.length; i++) {
      const p1 = latLngs[i],
        p2 = latLngs[(i + 1) % latLngs.length];
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

const isPointInPolygon = (point, vs) => {
  const x = point[0],
    y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
      yi = vs[i][1],
      xj = vs[j][0],
      yj = vs[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const generateZigZag = (geoJson, widthMeters) => {
  if (!geoJson?.coordinates) return [];
  const coords = geoJson.coordinates[0].map((c) => [c[1], c[0]]);
  const minLat = Math.min(...coords.map((c) => c[0])),
    maxLat = Math.max(...coords.map((c) => c[0]));
  const minLng = Math.min(...coords.map((c) => c[1])),
    maxLng = Math.max(...coords.map((c) => c[1]));
  const step = (widthMeters || 2) / 111320;
  let path = [],
    leftToRight = true;

  for (let lat = minLat + step / 2; lat <= maxLat; lat += step) {
    let row = [];
    for (let lng = minLng; lng <= maxLng; lng += step / 4) {
      if (isPointInPolygon([lat, lng], coords)) row.push([lat, lng]);
    }
    if (row.length > 0) {
      if (leftToRight) {
        path.push(row[0], row.at(-1));
      } else {
        path.push(row.at(-1), row[0]);
      }
      leftToRight = !leftToRight;
    }
  }
  return path;
};

const updateAreaTooltip = (layer, t) => {
  if (!(layer instanceof L.Polygon)) return;
  const latlngs = layer.getLatLngs();
  let mainArea = 0,
    holesArea = 0;
  const shapes = Array.isArray(latlngs[0]) ? latlngs : [latlngs];
  shapes.forEach((ring, index) => {
    const ringArea = calculateGeodesicArea(ring);
    if (index === 0) mainArea = ringArea;
    else holesArea += ringArea;
  });
  const finalArea = mainArea - holesArea;
  const areaLabel = t ? t("control.area", "Área") : "Area";
  let text =
    finalArea < 10000
      ? `${areaLabel}: ${Math.round(finalArea).toLocaleString()} m²`
      : `${areaLabel}: ${(finalArea / 10000).toFixed(2)} ha`;

  if (layer.getTooltip()) layer.setTooltipContent(text);
  else
    layer.bindTooltip(text, {
      permanent: true,
      direction: "center",
      className: "area-tooltip",
    });
};

const MapResizer = ({ showPanel }) => {
  const map = useMap();
  useEffect(() => {
    let startTime = performance.now();
    let animationFrame;
    const animate = (time) => {
      map.invalidateSize({ animate: false });
      if (time - startTime < 350)
        animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [showPanel, map]);
  return null;
};
MapResizer.propTypes = { showPanel: PropTypes.bool.isRequired };

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
        setSafeZone(
          (Array.isArray(latlngs[0]) ? latlngs[0] : latlngs).map((p) => [
            p.lat,
            p.lng,
          ]),
        );
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
      hintlineStyle: { color: "#10b981", dashArray: [5, 5] },
    });
    map.pm.setLang(i18n.language.startsWith("es") ? "es" : "en");
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

    map.on("pm:drawstart", () => (ignoreClickRef.current = true));
    map.on("pm:drawend", () =>
      setTimeout(() => (ignoreClickRef.current = false), 300),
    );
    map.on(
      "pm:globaldragmodetoggled",
      (e) => (ignoreClickRef.current = e.enabled),
    );
    map.on(
      "pm:globalrotatemodetoggled",
      (e) => (ignoreClickRef.current = e.enabled),
    );

    map.on("pm:create", (e) => {
      if (e.layer.pm?.hasSelfIntersection()) {
        alert(t("control.polygonError"));
        map.removeLayer(e.layer);
        return;
      }
      map.eachLayer((l) => {
        if (l.pm && l !== e.layer && l instanceof L.Polygon && !l._pmTempLayer)
          map.removeLayer(l);
      });
      handleZoneUpdate(e.layer);
      e.layer.on("pm:edit pm:dragend pm:rotateend", (evt) =>
        handleZoneUpdate(evt.target),
      );
      e.layer.on("pm:cut", (evt) => handleZoneUpdate(evt.layer));
    });

    map.on("pm:remove", () => {
      if (!map.pm.getGeomanLayers().some((l) => l instanceof L.Polygon)) {
        clearSafeZone();
        isZoneLoadedRef.current = false;
      }
    });

    return () => {
      map.pm.removeControls();
      map.off(
        "pm:create pm:remove pm:drawstart pm:drawend pm:globaldragmodetoggled pm:globalrotatemodetoggled",
      );
    };
  }, [map, clearSafeZone, ignoreClickRef, handleZoneUpdate, t, i18n.language]);

  useEffect(() => {
    if (!map || !safeZone || safeZone.length === 0 || isZoneLoadedRef.current)
      return;
    map.eachLayer((l) => {
      if (l instanceof L.Polygon && !l._pmTempLayer) map.removeLayer(l);
    });
    const polygon = L.polygon(safeZone, {
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.2,
    }).addTo(map);
    updateAreaTooltip(polygon, t);
    polygon.on("pm:edit pm:dragend pm:rotateend", (e) =>
      handleZoneUpdate(e.target),
    );
    polygon.on("pm:cut", (e) => handleZoneUpdate(e.layer));
    isZoneLoadedRef.current = true;
  }, [map, safeZone, handleZoneUpdate, t]);

  return null;
};
GeomanControls.propTypes = {
  ignoreClickRef: PropTypes.shape({ current: PropTypes.bool }).isRequired,
};

const createRobotArrowIcon = (heading) =>
  new L.DivIcon({
    className: "robot-arrow-icon",
    html: `<div style="transform: rotate(${heading}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s linear;"><img src="/robot-arrow.svg" alt="Robot" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" /></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -20],
  });

const ClickHandler = ({ ignoreClickRef }) => {
  const { navigateToPoint, queueNavigationPoint, system } = useRobotStore();
  useMapEvents({
    click(e) {
      if (ignoreClickRef.current) return;
      const isDrawing = e.target.pm?.globalDrawModeEnabled?.(),
        isEditing = e.target.pm?.globalEditModeEnabled?.(),
        isDragging = e.target.pm?.globalDragModeEnabled?.(),
        isRotating = e.target.pm?.globalRotateModeEnabled?.();
      if (
        system.mode !== "MANUAL" &&
        !isDrawing &&
        !isEditing &&
        !isDragging &&
        !isRotating
      ) {
        if (e.originalEvent.shiftKey)
          queueNavigationPoint(e.latlng.lat, e.latlng.lng);
        else navigateToPoint(e.latlng.lat, e.latlng.lng);
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
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (position.lat && position.lon)
          map.setView([position.lat, position.lon], 19);
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
  const {
    position,
    navTarget,
    navQueue,
    pathHistory,
    system,
    setSafeZone,
    setControlMode,
    navigateToPoint,
    queueNavigationPoint,
    totalMissionPoints,
    setTotalMissionPoints,
  } = useRobotStore();

  const { misiones, fetchMisiones, startMissionRun } = useMissionStore();
  const ignoreClickRef = useRef(false);

  const [showMissionsPanel, setShowMissionsPanel] = useState(false);
  const [hoveredMission, setHoveredMission] = useState(null);
  const [loadedMission, setLoadedMission] = useState(null);

  useEffect(() => {
    fetchMisiones();
  }, [fetchMisiones]);

  // Lógica de Barra de Progreso
  const pointsRemaining = navQueue.length + (navTarget ? 1 : 0);
  const pointsCompleted = Math.max(0, totalMissionPoints - pointsRemaining);
  const progressPercent =
    totalMissionPoints > 0
      ? Math.round((pointsCompleted / totalMissionPoints) * 100)
      : 0;

  // Finalizar misión auto: Resetea cuando se acaban los puntos
  useEffect(() => {
    if (pointsRemaining === 0 && totalMissionPoints > 0) {
      setControlMode("MANUAL");
      setTotalMissionPoints(0);
    }
  }, [
    pointsRemaining,
    totalMissionPoints,
    setControlMode,
    setTotalMissionPoints,
  ]);

  const handleLoadMission = (mission) => {
    if (system.battery < mission.bateria_minima) {
      alert(
        `⚠️ Batería insuficiente. La misión requiere ${mission.bateria_minima}%, pero el robot tiene ${system.battery}%`,
      );
      return;
    }
    setSafeZone(mission.area_trabajo.coordinates[0].map((c) => [c[1], c[0]]));
    setLoadedMission(mission);
  };

  const handleStartMissionAuto = async () => {
    if (!loadedMission) return;
    await startMissionRun(loadedMission.id);

    setControlMode("AUTO");

    const path = generateZigZag(
      loadedMission.area_trabajo,
      loadedMission.ancho_trabajo,
    );
    if (path.length > 0) {
      setTotalMissionPoints(path.length); // Guardamos la cantidad global
      navigateToPoint(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++)
        queueNavigationPoint(path[i][0], path[i][1]);
    }
    setShowMissionsPanel(false);
  };

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

  const hoveredPolygon =
    hoveredMission?.area_trabajo?.coordinates[0].map((c) => [c[1], c[0]]) || [];
  const hoveredZigZag = hoveredMission
    ? generateZigZag(hoveredMission.area_trabajo, hoveredMission.ancho_trabajo)
    : [];

  return (
    <div className="control-map-wrapper">
      <button
        className="toggle-missions-btn"
        onClick={() => setShowMissionsPanel(!showMissionsPanel)}
      >
        🗺️ {t("control.missionsBtn")}
      </button>

      {/* WIDGET DE PROGRESO: Se muestra siempre si hay puntos, sin importar el modo */}
      {totalMissionPoints > 0 && (
        <div className="mission-progress-widget">
          <span className="progress-percent">{progressPercent}%</span>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="progress-points">
            {pointsCompleted} / {totalMissionPoints} pts
          </span>
        </div>
      )}

      <MapContainer
        center={[position.lat, position.lon]}
        zoom={18}
        scrollWheelZoom={true}
        className="control-leaflet-map"
      >
        <MapResizer showPanel={showMissionsPanel} />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ClickHandler ignoreClickRef={ignoreClickRef} />
        <GeomanControls ignoreClickRef={ignoreClickRef} />
        <CenterButton />

        {showMissionsPanel && hoveredMission && hoveredPolygon.length > 0 && (
          <>
            <Polygon
              positions={hoveredPolygon}
              pathOptions={{
                color: "gray",
                fillColor: "gray",
                fillOpacity: 0.3,
                dashArray: "5,5",
              }}
            />
            <Polyline
              positions={hoveredZigZag}
              pathOptions={{ color: "#d1d5db", weight: 2, dashArray: "5,5" }}
            />
          </>
        )}

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
          <Polyline
            positions={fullQueuePath}
            color="#00ffcc"
            weight={3}
            dashArray="10, 10"
            opacity={0.8}
          />
        )}

        {navTarget && (
          <Marker position={[navTarget.lat, navTarget.lon]}>
            <Popup>{t("control.currentTarget")}</Popup>
          </Marker>
        )}
      </MapContainer>

      <div
        className={`missions-sidebar-container ${showMissionsPanel ? "open" : ""}`}
      >
        <div className="sidebar-inner-content">
          <div className="sidebar-header">
            <h3>📋 {t("control.loadMission")}</h3>
            <button onClick={() => setShowMissionsPanel(false)}>✖</button>
          </div>

          <div className="sidebar-mission-list">
            {misiones.map((m) => (
              <article
                key={m.id}
                className={`sidebar-mission-card ${loadedMission?.id === m.id ? "loaded" : ""}`}
                onMouseEnter={() => setHoveredMission(m)}
                onMouseLeave={() => setHoveredMission(null)}
                onFocus={() => setHoveredMission(m)}
                onBlur={() => setHoveredMission(null)}
                aria-label={`Misión: ${m.nombre}`}
              >
                <h4>{m.nombre}</h4>
                <p>
                  {t("control.data")}: {m.tipo_tarea}
                </p>
                <p>
                  {t("control.batteryReq")}: {m.bateria_minima}%
                </p>

                <div className="card-actions">
                  <button
                    className="btn-load"
                    onClick={() => handleLoadMission(m)}
                  >
                    {t("control.loadZone")}
                  </button>
                  {loadedMission?.id === m.id && (
                    <button
                      className="btn-start"
                      onClick={handleStartMissionAuto}
                    >
                      {t("control.startAuto")}
                    </button>
                  )}
                </div>
              </article>
            ))}
            {misiones.length === 0 && (
              <p style={{ textAlign: "center", marginTop: "20px" }}>
                {t("control.noMissions")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlMap;
