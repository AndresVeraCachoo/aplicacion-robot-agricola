import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useMissionStore } from "../../store/missionStore";
import { useToastStore } from "../../store/toastStore";
import { useMissionForm } from "../../hooks/useMissionForm";

import { MissionMapPanel } from "../../features/missions/components/MissionMapPanel";
import { MissionFormPanel } from "../../features/missions/components/MissionFormPanel";
import { MissionListSection } from "../../features/missions/components/MissionListSection";
import { MissionDeleteModal } from "../../features/missions/components/MissionDeleteModal";

import "./MissionsPage.css";

/**
 * Componente principal de la página de misiones.
 * Actúa como orquestador conectando el estado global, hooks personalizados y subcomponentes.
 * @returns {JSX.Element}
 */
function MissionsPage() {
  const { t } = useTranslation();
  const { missions, fetchMissions, deleteMission } = useMissionStore();
  const { addToast } = useToastStore();
  const mapRef = useRef();

  const [clickedPos, setClickedPos] = useState(null);
  const [missionToDelete, setMissionToDelete] = useState(null);

  // Función para limpiar los polígonos no guardados del mapa (ej. al cancelar edición)
  const handleClearMap = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.eachLayer((l) => {
        if (l.pm && l instanceof window.L.Polygon && !l._pmTempLayer) {
          map.removeLayer(l);
        }
      });
    }
  }, []);

  const { state: formState, setters: formSetters, handlers: formHandlers } = useMissionForm(handleClearMap);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleDeleteMission = async () => {
    if (!missionToDelete) return;
    try {
      await deleteMission(missionToDelete);
      addToast(
        t("missions.card.deleteSuccess", "Misión eliminada correctamente"),
        "info",
      );
      setMissionToDelete(null);
      fetchMissions();
    } catch {
      addToast("Error al eliminar la misión", "error");
    }
  };

  return (
    <div className="missions-page">
      <div className="missions-layout">
        <MissionFormPanel 
          formState={formState}
          formSetters={formSetters}
          formHandlers={formHandlers}
        />

        <main className="mission-map-panel">
          <MissionMapPanel 
            mapRef={mapRef}
            workArea={formState.workArea}
            setWorkArea={formSetters.setWorkArea}
            editingId={formState.editingId}
            setClickedPos={setClickedPos}
            clickedPos={clickedPos}
          />

          {clickedPos && (
            <div className="clicked-coords-display">
              <span className="icon-pin">📍</span>
              {t("missions.map.lat")}: {clickedPos.lat.toFixed(5)} |{" "}
              {t("missions.map.lon")}: {clickedPos.lng.toFixed(5)}
            </div>
          )}
        </main>
      </div>

      <MissionListSection 
        missions={missions}
        onEditMission={formHandlers.handleEditMission}
        onDeleteClick={setMissionToDelete}
      />

      <MissionDeleteModal 
        isOpen={!!missionToDelete}
        onClose={() => setMissionToDelete(null)}
        onDeleteConfirm={handleDeleteMission}
      />
    </div>
  );
}

export default MissionsPage;
