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
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import "./MissionsPage.css";

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

const GeomanMissionControls = ({
  workArea,
  setWorkArea,
  editingId,
  addToast,
}) => {
  const { t, i18n } = useTranslation();
  const map = useMap();
  const polygonLoadedRef = useRef(null);

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
      cutPolygon: true,
      rotateMode: true,
      removalMode: true,
    });

    map.on("pm:create", (e) => {
      const { layer } = e;
      if (layer.pm?.hasSelfIntersection()) {
        addToast(
          t(
            "control.polygonError",
            "El polígono no puede cruzarse a sí mismo.",
          ),
          "error",
        );
        map.removeLayer(layer);
        return;
      }
      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });
      setWorkArea(layer.toGeoJSON().geometry);
      layer.on(
        "pm:edit pm:dragend pm:rotateend pm:markerdragend pm:vertexadded pm:vertexremoved",
        (evt) => {
          setWorkArea(evt.target.toGeoJSON().geometry);
        },
      );
      layer.on("pm:cut", (evt) => {
        setWorkArea(evt.layer.toGeoJSON().geometry);
      });
    });

    map.on("pm:remove", () => setWorkArea(null));

    return () => {
      map.pm.removeControls();
      map.off("pm:create");
      map.off("pm:remove");
    };
  }, [map, setWorkArea, i18n.language, t, addToast]);

  useEffect(() => {
    if (editingId && workArea?.type === "Polygon") {
      if (polygonLoadedRef.current === editingId) return;

      map.eachLayer((l) => {
        if (l instanceof L.Polygon && !l._pmTempLayer) map.removeLayer(l);
      });

      const latlngs = workArea.coordinates[0].map((c) => [c[1], c[0]]);
      const polygon = L.polygon(latlngs, { color: "#3388ff" }).addTo(map);

      map.fitBounds(polygon.getBounds(), { padding: [20, 20] });

      polygon.on(
        "pm:edit pm:dragend pm:rotateend pm:markerdragend pm:vertexadded pm:vertexremoved",
        (e) => setWorkArea(e.target.toGeoJSON().geometry),
      );
      polygon.on("pm:cut", (e) => setWorkArea(e.layer.toGeoJSON().geometry));

      polygonLoadedRef.current = editingId;
    } else if (!editingId) {
      polygonLoadedRef.current = null;
    }
  }, [workArea, editingId, map, setWorkArea]);

  return null;
};

GeomanMissionControls.propTypes = {
  workArea: PropTypes.object,
  setWorkArea: PropTypes.func.isRequired,
  editingId: PropTypes.number,
  addToast: PropTypes.func.isRequired,
};

/**
 * Componente de la página de misiones.
 * Permite crear, visualizar, editar y eliminar misiones en el mapa con Geoman.
 * @returns {JSX.Element}
 */
function MissionsPage() {
  const { t } = useTranslation();
  const { missions, fetchMissions, createMission, updateMission, deleteMission } =
    useMissionStore();
  const { position, system } = useRobotStore();
  const { addToast } = useToast();
  const mapRef = useRef();

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [sensors, setSensors] = useState({
    humidity: true,
    temperature: false,
    ph: false,
    npk: false,
    radiation: false,
  });
  const [workingWidth, setWorkingWidth] = useState(2);
  const [passAngle, setPassAngle] = useState(0);
  const [minBattery, setMinBattery] = useState(20);
  const [workArea, setWorkArea] = useState(null);
  const [clickedPos, setClickedPos] = useState(null);

  const [missionToDelete, setMissionToDelete] = useState(null);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleCheckboxChange = (sensor) => {
    setSensors({ ...sensors, [sensor]: !sensors[sensor] });
  };

  const handleEditMission = (m) => {
    setEditingId(m.id);
    setName(m.name);
    setWorkingWidth(m.workingWidth);
    setPassAngle(m.passAngle);
    setMinBattery(m.minBattery);
    setWorkArea(m.workArea);

    const activeSensors = m.taskType.toLowerCase();
    setSensors({
      humidity: activeSensors.includes("humedad"),
      temperature: activeSensors.includes("temp"),
      ph: activeSensors.includes("ph"),
      npk: activeSensors.includes("n-p-k") || activeSensors.includes("npk"),
      radiation: activeSensors.includes("rad"),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setWorkingWidth(2);
    setPassAngle(0);
    setMinBattery(20);
    setSensors({
      humidity: true,
      temperature: false,
      ph: false,
      npk: false,
      radiation: false,
    });
    setWorkArea(null);
    if (mapRef.current) {
      mapRef.current.eachLayer((l) => {
        if (l instanceof L.Polygon && !l._pmTempLayer)
          mapRef.current.removeLayer(l);
      });
    }
  };

  const handleSaveMission = async (e) => {
    e.preventDefault();
    if (!workArea) {
      addToast(
        t(
          "missions.alerts.drawAreaFirst",
          "Dibuja el área de trabajo en el mapa primero.",
        ),
        "error",
      );
      return;
    }

    const mapSensorsToLocale = {
      humidity: t("missions.form.humidity"),
      temperature: t("missions.form.soilTemp"),
      ph: t("missions.form.ph"),
      npk: t("missions.form.npk"),
      radiation: t("missions.form.solarRad"),
    };

    const activeSensorsString = Object.entries(sensors)
      .filter(([, isActive]) => isActive)
      .map(([sensor]) => mapSensorsToLocale[sensor])
      .join(" - ");

    if (!activeSensorsString) {
      addToast(
        t("missions.alerts.selectData", "Selecciona al menos un tipo de dato."),
        "error",
      );
      return;
    }

    const missionData = {
      name,
      taskType: activeSensorsString,
      workingWidth,
      passAngle,
      minBattery,
      workArea,
    };

    try {
      if (editingId) {
        const success = await updateMission(editingId, missionData);
        if (success) {
          addToast(
            t(
              "missions.alerts.updateSuccess",
              "Misión actualizada correctamente",
            ),
            "success",
          );
        } else {
          addToast("Error al actualizar la misión", "error");
        }
      } else {
        await createMission(missionData);
        addToast(
          t("missions.alerts.saveSuccess", "¡Misión creada con éxito!"),
          "success",
        );
      }

      handleCancelEdit();
      fetchMissions();
    } catch (error) {
      console.error("Error al guardar la misión:", error);
      addToast("Ocurrió un error al guardar la misión", "error");
    }
  };

  const handleDeleteMission = async (id) => {
    try {
      await deleteMission(id);
      addToast(
        t("missions.card.deleteSuccess", "Misión eliminada correctamente"),
        "info",
      );
      setMissionToDelete(null);
      fetchMissions();
    } catch (error) {
      console.error("Error al eliminar la misión:", error);
      addToast("Error al eliminar la misión", "error");
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
          <div className="mission-form-card">
            <h3>
              {editingId
                ? t("missions.editTitle", "Editar Misión")
                : t("missions.createNew")}
            </h3>

          <form onSubmit={handleSaveMission}>
            <div className="form-group">
              <label htmlFor="mission-name">{t("missions.form.name")}</label>
              <input
                id="mission-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <span
                style={{
                  fontSize: "0.85rem",
                  marginBottom: "5px",
                  color: "var(--text-main)",
                  opacity: 0.9,
                  display: "block",
                  fontWeight: "600",
                }}
              >
                {t("missions.form.dataToCollect")}
              </span>
              <div className="sensors-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sensors.humidity}
                    onChange={() => handleCheckboxChange("humidity")}
                  />
                  {t("missions.form.humidity")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sensors.temperature}
                    onChange={() => handleCheckboxChange("temperature")}
                  />
                  {t("missions.form.soilTemp")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sensors.ph}
                    onChange={() => handleCheckboxChange("ph")}
                  />
                  {t("missions.form.ph")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sensors.npk}
                    onChange={() => handleCheckboxChange("npk")}
                  />
                  {t("missions.form.npk")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sensors.radiation}
                    onChange={() => handleCheckboxChange("radiation")}
                  />
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
                  value={workingWidth}
                  onChange={(e) =>
                    setWorkingWidth(Number.parseFloat(e.target.value))
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
                  value={passAngle}
                  onChange={(e) =>
                    setPassAngle(Number.parseInt(e.target.value))
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
                  value={minBattery}
                  onChange={(e) =>
                    setMinBattery(Number.parseInt(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn-save">
                {editingId
                  ? t("missions.form.updateBtn", "Actualizar Misión")
                  : t("missions.form.saveBtn")}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                >
                  {t("users.cancel", "Cancelar")}
                </button>
              )}
            </div>
          </form>
          </div>
        </aside>

        <main className="mission-map-panel">
          <MapContainer
            center={initialCenter}
            zoom={18}
            ref={mapRef}
            style={{
              height: "100%",
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
            }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <GeomanMissionControls
              workArea={workArea}
              setWorkArea={setWorkArea}
              editingId={editingId}
              addToast={addToast}
            />
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
          {missions.map((m) => (
            <div key={m.id} className="mission-card">
              <h4>{m.name}</h4>
              <p>
                <strong style={{ color: "var(--accent-green)" }}>
                  {t("missions.card.data")}:
                </strong>{" "}
                {m.taskType}
              </p>
              <p>
                <strong>{t("missions.card.batteryReq")}:</strong>{" "}
                {m.minBattery}%
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  onClick={() => handleEditMission(m)}
                  className="btn-edit-mission"
                >
                  {t("users.edit", "Editar")}
                </button>
                <button
                  onClick={() => setMissionToDelete(m.id)}
                  className="btn-delete"
                  style={{ flex: 1, margin: 0 }}
                >
                  {t("missions.card.deleteBtn")}
                </button>
              </div>
            </div>
          ))}
          {missions.length === 0 && <p>{t("missions.noMissions")}</p>}
        </div>
      </section>

      <Modal
        isOpen={!!missionToDelete}
        onClose={() => setMissionToDelete(null)}
        title={t("missions.confirmDeleteTitle", "Eliminar Misión")}
      >
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <p style={{ marginBottom: "20px", color: "var(--text-main)" }}>
            {t(
              "missions.confirmDelete",
              "¿Estás seguro de que deseas eliminar esta misión? Esta acción no se puede deshacer.",
            )}
          </p>
          <div
            style={{ display: "flex", gap: "15px", justifyContent: "center" }}
          >
            <button
              onClick={() => setMissionToDelete(null)}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "transparent",
                color: "var(--text-main)",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {t("users.cancel", "Cancelar")}
            </button>
            <button
              onClick={() => handleDeleteMission(missionToDelete)}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {t("missions.card.deleteBtn", "Eliminar")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MissionsPage;
