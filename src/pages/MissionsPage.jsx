// src/pages/MissionsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import { useMissionStore } from "../store/missionStore";
import { useRobotStore } from "../store/robotStore";
import "./MissionsPage.css";

// Fixes para ESLint y Leaflet
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

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

const CenterButton = () => {
  const { t } = useTranslation();
  const map = useMap();
  const position = useRobotStore((state) => state.position);

  const centerView = () => {
    if (position.lat && position.lon) {
      map.setView([position.lat, position.lon], 19);
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
      title={t("missions.map.centerRobot")}
    >
      <span style={{ fontSize: "1.2em" }}>🎯</span>
    </button>
  );
};

const MapClickHandler = ({ setClickedPos }) => {
  useMapEvents({
    click(e) {
      const isDrawing = e.target.pm?.globalDrawModeEnabled?.();
      const isEditing = e.target.pm?.globalEditModeEnabled?.();
      const isDragging = e.target.pm?.globalDragModeEnabled?.();
      const isRotating = e.target.pm?.globalRotateModeEnabled?.();

      if (!isDrawing && !isEditing && !isDragging && !isRotating) {
        setClickedPos(e.latlng);
      }
    },
  });
  return null;
};

MapClickHandler.propTypes = {
  setClickedPos: PropTypes.func.isRequired,
};

const GeomanMissionControls = ({ setAreaTrabajo }) => {
  const { t, i18n } = useTranslation();
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.pm.setGlobalOptions({
      allowSelfIntersection: false,
      snappable: true,
      snapDistance: 20,
    });

    const currentLang = i18n.language.startsWith("es") ? "es" : "en";
    map.pm.setLang(currentLang);

    map.pm.addControls({
      position: "topright",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      rotateMode: true,
      removalMode: true,
    });

    map.on("pm:create", (e) => {
      const { layer } = e;
      if (layer.pm?.hasSelfIntersection()) {
        alert(t("missions.alerts.polygonError"));
        map.removeLayer(layer);
        return;
      }

      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });

      const geoJson = layer.toGeoJSON();
      setAreaTrabajo(geoJson.geometry);
    });

    map.on("pm:remove", () => {
      setAreaTrabajo(null);
    });

    return () => {
      map.pm.removeControls();
      map.off("pm:create");
      map.off("pm:remove");
    };
  }, [map, setAreaTrabajo, i18n.language, t]);

  return null;
};

GeomanMissionControls.propTypes = {
  setAreaTrabajo: PropTypes.func.isRequired,
};

function MissionsPage() {
  const { t } = useTranslation();
  const { misiones, fetchMisiones, createMision, deleteMision } =
    useMissionStore();
  const { position, system } = useRobotStore();
  const mapRef = useRef();

  const [nombre, setNombre] = useState("");
  const [sensores, setSensores] = useState({
    humedad: true,
    temperatura: false,
    ph: false,
    npk: false,
    radiacion: false,
  });

  const [anchoTrabajo, setAnchoTrabajo] = useState(2);
  const [anguloPasada, setAnguloPasada] = useState(0);
  const [bateriaMinima, setBateriaMinima] = useState(20);
  const [areaTrabajo, setAreaTrabajo] = useState(null);
  const [clickedPos, setClickedPos] = useState(null);

  useEffect(() => {
    fetchMisiones();
  }, [fetchMisiones]);

  const handleCheckboxChange = (sensor) => {
    setSensores({ ...sensores, [sensor]: !sensores[sensor] });
  };

  const handleSaveMission = async (e) => {
    e.preventDefault();
    if (!areaTrabajo) {
      alert(t("missions.alerts.drawAreaFirst"));
      return;
    }

    // Traducción dinámica de los sensores para guardarlos en la base de datos
    const mapSensorsToLocale = {
      humedad: t("missions.form.humidity"),
      temperatura: t("missions.form.soilTemp"),
      ph: t("missions.form.ph"),
      npk: t("missions.form.npk"),
      radiacion: t("missions.form.solarRad"),
    };

    const sensoresActivos = Object.entries(sensores)
      .filter(([activo]) => activo)
      .map(([key]) => mapSensorsToLocale[key])
      .join(", ");

    if (!sensoresActivos) {
      alert(t("missions.alerts.selectData"));
      return;
    }

    const exito = await createMision({
      nombre,
      tipo_tarea: sensoresActivos,
      ancho_trabajo: anchoTrabajo,
      angulo_pasada: anguloPasada,
      bateria_minima: bateriaMinima,
      area_trabajo: areaTrabajo,
    });

    if (exito) {
      alert(t("missions.alerts.saveSuccess"));
      setNombre("");
      setAreaTrabajo(null);
      if (mapRef.current) {
        mapRef.current.eachLayer((layer) => {
          if (layer instanceof L.Polygon && layer.pm) {
            mapRef.current.removeLayer(layer);
          }
        });
      }
    }
  };

  const initialCenter =
    position.lat && position.lon
      ? [position.lat, position.lon]
      : [37.7749, -122.4194];

  return (
    <div className="missions-page">
      <div className="missions-layout">
        <aside className="mission-form-panel">
          <h3>{t("missions.createNew")}</h3>
          <form onSubmit={handleSaveMission}>
            <div className="form-group">
              <label htmlFor="mission-name">{t("missions.form.name")}</label>
              <input
                id="mission-name"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              {/* Solución a SonarLint S6853: Cambiamos <label> por <span> con los mismos estilos */}
              <span
                style={{
                  fontSize: "0.85rem",
                  marginBottom: "5px",
                  color: "#94a3b8",
                  display: "block",
                }}
              >
                {t("missions.form.dataToCollect")}
              </span>
              <div className="sensors-checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={sensores.humedad}
                    onChange={() => handleCheckboxChange("humedad")}
                  />{" "}
                  {t("missions.form.humidity")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sensores.temperatura}
                    onChange={() => handleCheckboxChange("temperatura")}
                  />{" "}
                  {t("missions.form.soilTemp")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sensores.ph}
                    onChange={() => handleCheckboxChange("ph")}
                  />{" "}
                  {t("missions.form.ph")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sensores.npk}
                    onChange={() => handleCheckboxChange("npk")}
                  />{" "}
                  {t("missions.form.npk")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sensores.radiacion}
                    onChange={() => handleCheckboxChange("radiacion")}
                  />{" "}
                  {t("missions.form.solarRad")}
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mission-width">
                  {t("missions.form.width")}
                </label>
                <input
                  id="mission-width"
                  type="number"
                  step="0.1"
                  value={anchoTrabajo}
                  onChange={(e) =>
                    setAnchoTrabajo(Number.parseFloat(e.target.value))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="mission-angle">
                  {t("missions.form.angle")}
                </label>
                <input
                  id="mission-angle"
                  type="number"
                  value={anguloPasada}
                  onChange={(e) =>
                    setAnguloPasada(Number.parseInt(e.target.value))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="mission-battery">
                  {t("missions.form.minBattery")}
                </label>
                <input
                  id="mission-battery"
                  type="number"
                  value={bateriaMinima}
                  onChange={(e) =>
                    setBateriaMinima(Number.parseInt(e.target.value))
                  }
                />
              </div>
            </div>

            <button type="submit" className="btn-save-mission">
              {t("missions.form.saveBtn")}
            </button>
          </form>
        </aside>

        <main className="mission-map-panel">
          <MapContainer
            center={initialCenter}
            zoom={18}
            ref={mapRef}
            style={{
              height: "100%",
              width: "100%",
              borderRadius: "12px",
              zIndex: 1,
            }}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

            <GeomanMissionControls setAreaTrabajo={setAreaTrabajo} />
            <CenterButton />
            <MapClickHandler setClickedPos={setClickedPos} />

            {position.lat && position.lon && (
              <Marker
                position={[position.lat, position.lon]}
                icon={createRobotArrowIcon(system.heading || 0)}
              >
                <Popup>
                  AgriRobot
                  <br />
                  {t("missions.map.heading")}: {Math.floor(system.heading || 0)}
                  °
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {clickedPos && (
            <div className="clicked-coords-display">
              <span style={{ color: "#ef4444", marginRight: "5px" }}>📍</span>
              {t("missions.map.lat")}: {clickedPos.lat.toFixed(5)} |{" "}
              {t("missions.map.lon")}: {clickedPos.lng.toFixed(5)}
            </div>
          )}
        </main>
      </div>

      <section className="mission-list-section">
        <h3>{t("missions.savedMissions")}</h3>
        <div className="mission-grid">
          {misiones.map((m) => (
            <div key={m.id} className="mission-card">
              <h4>{m.nombre}</h4>
              <p>
                <strong style={{ color: "#10b981" }}>
                  {t("missions.card.data")}:
                </strong>{" "}
                {m.tipo_tarea}
              </p>
              <p>
                <strong>{t("missions.card.batteryReq")}:</strong>{" "}
                {m.bateria_minima}%
              </p>
              <button onClick={() => deleteMision(m.id)} className="btn-delete">
                {t("missions.card.deleteBtn")}
              </button>
            </div>
          ))}
          {misiones.length === 0 && <p>{t("missions.noMissions")}</p>}
        </div>
      </section>
    </div>
  );
}

export default MissionsPage;
