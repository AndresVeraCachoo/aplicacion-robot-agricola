import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "../store/missionStore";
import { useToastStore } from "../store/toastStore";

const initialSensors = {
  humidity: true,
  temperature: false,
  ph: false,
  npk: false,
  radiation: false,
};

/**
 * Hook para manejar el estado y lógica del formulario de misiones.
 * @param {Function} clearMap - Función para limpiar los polígonos dibujados en el mapa.
 * @returns {Object} Estado y funciones manejadoras.
 */
export function useMissionForm(clearMap) {
  const { t } = useTranslation();
  const { createMission, updateMission } = useMissionStore();
  const { addToast } = useToastStore();

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [sensors, setSensors] = useState(initialSensors);
  const [workingWidth, setWorkingWidth] = useState(2);
  const [passAngle, setPassAngle] = useState(0);
  const [minBattery, setMinBattery] = useState(20);
  const [workArea, setWorkArea] = useState(null);

  const handleCheckboxChange = useCallback((sensor) => {
    setSensors((prev) => ({ ...prev, [sensor]: !prev[sensor] }));
  }, []);

  const handleEditMission = useCallback((mission) => {
    setEditingId(mission.id);
    setName(mission.name);
    setWorkingWidth(mission.workingWidth);
    setPassAngle(mission.passAngle);
    setMinBattery(mission.minBattery);
    setWorkArea(mission.workArea);
    if (mission.sensors) {
      setSensors({ ...initialSensors, ...mission.sensors });
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setName("");
    setWorkingWidth(2);
    setPassAngle(0);
    setMinBattery(20);
    setSensors(initialSensors);
    setWorkArea(null);
    if (clearMap) clearMap();
  }, [clearMap]);

  const handleSaveMission = useCallback(
    async (e) => {
      e.preventDefault();
      if (!workArea?.coordinates || workArea.coordinates.length === 0) {
        addToast(
          t("missions.errorNoPolygon", "Debes dibujar un polígono en el mapa"),
          "warning",
        );
        return;
      }

      if (!name.trim()) {
        addToast(t("missions.errorNoName", "La misión debe tener un nombre"), "warning");
        return;
      }

      const hasActiveSensor = Object.values(sensors).some(Boolean);
      if (!hasActiveSensor) {
        addToast(
          t("missions.errorNoSensors", "Selecciona al menos un sensor"),
          "warning",
        );
        return;
      }

      const newMissionData = {
        name: name.trim(),
        workArea,
        workingWidth,
        passAngle,
        minBattery,
        sensors,
      };

      if (editingId) {
        const success = await updateMission(editingId, newMissionData);
        if (success) {
          addToast(t("missions.updated", "Misión actualizada"), "success");
          handleCancelEdit();
        }
      } else {
        const success = await createMission(newMissionData);
        if (success) {
          addToast(t("missions.created", "Misión creada"), "success");
          handleCancelEdit();
        }
      }
    },
    [
      name,
      workArea,
      workingWidth,
      passAngle,
      minBattery,
      sensors,
      editingId,
      updateMission,
      createMission,
      handleCancelEdit,
      addToast,
      t,
    ]
  );

  return {
    state: {
      editingId,
      name,
      sensors,
      workingWidth,
      passAngle,
      minBattery,
      workArea,
    },
    setters: {
      setName,
      setWorkingWidth,
      setPassAngle,
      setMinBattery,
      setWorkArea,
    },
    handlers: {
      handleCheckboxChange,
      handleEditMission,
      handleCancelEdit,
      handleSaveMission,
    },
  };
}
