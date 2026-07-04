import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { useRobotStore } from "../../../store/robotStore";
import { useToastStore } from "../../../store/toastStore";
import { createRobotArrowIcon, GEOMAN_DRAW_CONTROLS } from "../../../utils/mapUtils";



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
      <span className="icon-target">🎯</span>
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

const GeomanMissionControls = ({ workArea, setWorkArea, editingId, addToast }) => {
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
      ...GEOMAN_DRAW_CONTROLS,
    });

    map.on("pm:create", (e) => {
      const { layer } = e;
      if (layer.pm?.hasSelfIntersection()) {
        addToast(t("control.polygonError", "El polígono no puede cruzarse a sí mismo."), "error");
        map.removeLayer(layer);
        return;
      }
      map.eachLayer((l) => {
        if (l.pm && l !== layer && l instanceof L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });
      setWorkArea(layer.toGeoJSON().geometry);
      layer.on("pm:edit pm:dragend pm:rotateend pm:markerdragend pm:vertexadded pm:vertexremoved", (evt) => {
        setWorkArea(evt.target.toGeoJSON().geometry);
      });
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

      polygon.on("pm:edit pm:dragend pm:rotateend pm:markerdragend pm:vertexadded pm:vertexremoved", (e) => setWorkArea(e.target.toGeoJSON().geometry));
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

export function MissionMapPanel({ mapRef, workArea, setWorkArea, editingId, setClickedPos, clickedPos }) {
  const { position, system } = useRobotStore();
  const { addToast } = useToastStore();

  return (
    <div className="mission-map-container">
      <MapContainer
        center={[37.3828, -5.9731]}
        zoom={16}
        scrollWheelZoom={true}
        className="map-view"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        <GeomanMissionControls
          workArea={workArea}
          setWorkArea={setWorkArea}
          editingId={editingId}
          addToast={addToast}
        />
        <CenterButton />
        <MapClickHandler setClickedPos={setClickedPos} />

        {position?.lat && position?.lon && (
          <Marker
            position={[position.lat, position.lon]}
            icon={createRobotArrowIcon(system.heading || 0)}
            zIndexOffset={1000}
          >
            <Popup>Robot Agrícola (Tractor)</Popup>
          </Marker>
        )}

        {clickedPos && (
          <Marker position={clickedPos}>
            <Popup>
              {clickedPos.lat.toFixed(6)}, {clickedPos.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

MissionMapPanel.propTypes = {
  mapRef: PropTypes.object.isRequired,
  workArea: PropTypes.object,
  setWorkArea: PropTypes.func.isRequired,
  editingId: PropTypes.number,
  setClickedPos: PropTypes.func.isRequired,
  clickedPos: PropTypes.object,
};
