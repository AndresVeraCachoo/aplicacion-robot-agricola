import { prisma } from "../../config/db.js";
import { getSecureRandom, isPointInPolygon } from "../utils.js";
import { calculateSolarRadiation } from "./energy.js";

export const getActiveMissionContext = async () => {
  const exec = await prisma.missionExecution.findFirst({
    where: { status: { in: ['en_curso', 'ejecutando', 'activa'] } },
    orderBy: { id: 'desc' },
    include: { mission: true }
  });
  if (exec) {
    return { id: exec.id, name: exec.mission?.name, taskType: exec.mission?.taskType?.toLowerCase() || "" };
  }
  return { id: null, name: null, taskType: "" };
};

export const shouldSkipAgronomy = (state) => {
  if (state.isCharging || state.isPaused || Number.parseFloat(state.speed) === 0 || state.controlMode === "RETURNING_TO_BASE" || state.controlMode === "RESUMING_MISSION") {
    return true;
  }
  if (state.safeZonePolygon && state.safeZonePolygon.length >= 3) {
    if (!isPointInPolygon(state.currentLat, state.currentLon, state.safeZonePolygon)) {
      return true;
    }
  }
  return false;
};

export const generateSensorReadings = (taskStr, lat, lon, hasActiveMission) => {
  const collectHum = !hasActiveMission || taskStr.includes("humedad") || taskStr.includes("humidity");
  const collectTemp = !hasActiveMission || taskStr.includes("temp");
  const collectPh = !hasActiveMission || taskStr.includes("ph");
  const collectNpk = !hasActiveMission || taskStr.includes("n-p-k") || taskStr.includes("npk");
  const collectRad = !hasActiveMission || taskStr.includes("rad");

  const intensity = (Math.sin(lat * 15000) + Math.cos(lon * 15000) + 2) / 4;
  
  return {
    cHum: collectHum ? Math.max(0, Math.min(100, (20 + (intensity * 70)) + (getSecureRandom() * 4 - 2))).toFixed(1) : null,
    cTemp: collectTemp ? ((15 + (intensity * 20)) + (getSecureRandom() * 1 - 0.5)).toFixed(1) : null,
    cPh: collectPh ? Math.max(4, Math.min(10, (5 + (intensity * 3)) + (getSecureRandom() * 0.4 - 0.2))).toFixed(1) : null,
    cN: collectNpk ? (20 + getSecureRandom() * 60).toFixed(2) : null,
    cP: collectNpk ? (15 + getSecureRandom() * 45).toFixed(2) : null,
    cK: collectNpk ? (100 + getSecureRandom() * 150).toFixed(2) : null,
    cRad: collectRad ? calculateSolarRadiation(new Date()).toFixed(2) : null
  };
};
