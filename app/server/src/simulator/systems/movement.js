import { isPointInPolygon } from "../utils.js";

const handleAutoMode = (state) => {
  if (state.autoPath.length === 0 || state.currentPathIndex >= state.autoPath.length) {
    return { nextLat: state.currentLat, nextLon: state.currentLon, dLat: 0, dLon: 0 };
  }
  const target = state.autoPath[state.currentPathIndex];
  const distLat = target.lat - state.currentLat;
  const distLon = target.lon - state.currentLon;
  const distance = Math.hypot(distLat, distLon);
  const workSpeed = 0.0001 * (state.speedLimitPercent / 100);

  if (distance <= workSpeed) {
    state.currentPathIndex++;
    if (state.currentPathIndex >= state.autoPath.length) state.controlMode = "MANUAL";
    return { nextLat: target.lat, nextLon: target.lon, dLat: 0, dLon: 0 };
  }
  const ratio = workSpeed / distance;
  return { nextLat: state.currentLat + distLat * ratio, nextLon: state.currentLon + distLon * ratio, dLat: distLat * ratio, dLon: distLon * ratio };
};

const advanceNavQueue = (state) => {
  if (state.navQueue.length > 0) {
    state.navTarget = state.navQueue.shift();
  } else {
    state.controlMode = "MANUAL";
    state.navTarget = null;
  }
};

const moveTowardsTarget = (state, tLat, tLon, speedFactor) => {
  const distLat = tLat - state.currentLat;
  const distLon = tLon - state.currentLon;
  const distance = Math.hypot(distLat, distLon);
  const navSpeed = 0.0002 * speedFactor;

  if (distance <= navSpeed) {
    return { nextLat: tLat, nextLon: tLon, dLat: 0, dLon: 0, reached: true };
  }
  const ratio = navSpeed / distance;
  return { nextLat: state.currentLat + distLat * ratio, nextLon: state.currentLon + distLon * ratio, dLat: distLat * ratio, dLon: distLon * ratio, reached: false };
};

const handleNavigatingMode = (state, speedFactor) => {
  const tLat = state.navTarget ? state.navTarget.lat : state.currentLat;
  const tLon = state.navTarget ? state.navTarget.lon : state.currentLon;
  
  if (!state.navTarget && state.navQueue.length > 0) {
    state.navTarget = state.navQueue.shift();
    return { nextLat: state.currentLat, nextLon: state.currentLon, dLat: 0, dLon: 0 };
  }

  const result = moveTowardsTarget(state, tLat, tLon, speedFactor);
  if (result.reached) advanceNavQueue(state);
  return result;
};

const handleRtlMode = (state, speedFactor) => {
  const result = moveTowardsTarget(state, state.BASE_LAT, state.BASE_LON, Math.max(0.5, speedFactor));
  if (result.reached) state.speed = 0;
  return result;
};

const handleResumingMode = (state, speedFactor) => {
  if (!state.interruptedState) return { nextLat: state.currentLat, nextLon: state.currentLon, dLat: 0, dLon: 0 };
  const result = moveTowardsTarget(state, state.interruptedState.lat, state.interruptedState.lon, Math.max(0.5, speedFactor));
  if (result.reached) {
    state.controlMode = state.interruptedState.mode;
    state.currentPathIndex = state.interruptedState.autoPathIndex;
    state.interruptedState = null;
  }
  return result;
};

const handleManualMode = (state, speedFactor) => {
  if (state.manualVelocity.x !== 0) {
    state.heading = (state.heading + (state.manualVelocity.x * 15)) % 360;
    if (state.heading < 0) state.heading += 360;
  }
  if (state.manualVelocity.y === 0) {
    return { nextLat: state.currentLat, nextLon: state.currentLon, dLat: 0, dLon: 0 };
  }
  const baseSpeed = 0.00015 * speedFactor;
  const driveForce = state.manualVelocity.y * baseSpeed;
  const headingRad = state.heading * (Math.PI / 180);
  const dLat = Math.cos(headingRad) * driveForce;
  const dLon = Math.sin(headingRad) * driveForce;

  return { nextLat: state.currentLat + dLat, nextLon: state.currentLon + dLon, dLat: dLat, dLon: dLon };
};

export const calculateNextPosition = (state) => {
  const speedFactor = state.speedLimitPercent / 100;
  switch (state.controlMode) {
    case "AUTO": return handleAutoMode(state);
    case "NAVIGATING": return handleNavigatingMode(state, speedFactor);
    case "RETURNING_TO_BASE": return handleRtlMode(state, speedFactor);
    case "RESUMING_MISSION": return handleResumingMode(state, speedFactor);
    case "MANUAL": default: return handleManualMode(state, speedFactor);
  }
};

export const applyGeofencing = (state, nLat, nLon) => {
  if (!state.safeZonePolygon || state.safeZonePolygon.length < 3) return { validLat: nLat, validLon: nLon };
  if (nLat === state.currentLat && nLon === state.currentLon) return { validLat: nLat, validLon: nLon };
  if (state.controlMode !== "MANUAL") return { validLat: nLat, validLon: nLon };

  const isCurrentlyInside = isPointInPolygon(state.currentLat, state.currentLon, state.safeZonePolygon);
  if (!isCurrentlyInside) return { validLat: nLat, validLon: nLon };
  if (!isPointInPolygon(nLat, nLon, state.safeZonePolygon)) {
    return { validLat: state.currentLat, validLon: state.currentLon };
  }
  return { validLat: nLat, validLon: nLon };
};

export const updateSpeedAndHeading = (state, nLat, nLon, dLat, dLon) => {
  if (Math.abs(nLat - state.currentLat) > 0 || Math.abs(nLon - state.currentLon) > 0 || Math.abs(dLat) > 0) {
    if (state.controlMode !== "MANUAL") {
      if (Math.abs(dLat) > 0 || Math.abs(dLon) > 0) {
        state.heading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
      }
    }
    state.speed = (Math.hypot(nLat - state.currentLat, nLon - state.currentLon) * 100000).toFixed(2);
  } else {
    state.speed = 0;
  }
};
