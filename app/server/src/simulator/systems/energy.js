import { calculateDistanceMeters } from "../utils.js";

const SOLAR_EFFICIENCY = 0.005;
const IDLE_CHARGE_THRESHOLD = 30;
const BASE_CHARGE_DELAY = 5;

export const calculateSolarRadiation = (dateObj) => {
  const hour = dateObj.getHours() + (dateObj.getMinutes() / 60);
  if (hour < 6 || hour > 20) return 0;
  const radiationWave = Math.sin(Math.PI * (hour - 6) / 14);
  return Math.max(0, radiationWave * 1000);
};

export const checkBaseProximityForCharge = (state) => {
  const distToBase = calculateDistanceMeters(state.currentLat, state.currentLon, state.BASE_LAT, state.BASE_LON);
  if (Number(state.speed) === 0 && !state.isCharging && distToBase <= 3) {
    state.baseIdleCounter++;
    if (state.baseIdleCounter >= BASE_CHARGE_DELAY) {
      state.isCharging = true;
      state.currentLat = state.BASE_LAT;
      state.currentLon = state.BASE_LON;
      state.baseIdleCounter = 0;
      state.idleTicksCounter = 0;
      if (state.controlMode === "RETURNING_TO_BASE") {
        state.controlMode = state.interruptedState ? "RESUMING_MISSION" : "MANUAL";
      }
    }
  } else {
    state.baseIdleCounter = 0;
  }
};

export const checkIdleAutoCharge = (state) => {
  if (state.controlMode === "MANUAL" && Number(state.speed) === 0 && !state.isCharging) {
    state.idleTicksCounter++;
    if (state.idleTicksCounter >= IDLE_CHARGE_THRESHOLD) {
      state.isCharging = true;
      state.currentLat = state.BASE_LAT;
      state.currentLon = state.BASE_LON;
      state.idleTicksCounter = 0;
      state.baseIdleCounter = 0;
    }
  } else {
    state.idleTicksCounter = 0;
  }
};

const executeRTLSequence = (state) => {
  if (state.controlMode === "AUTO" || state.controlMode === "NAVIGATING") {
    state.interruptedState = { mode: state.controlMode, autoPathIndex: state.currentPathIndex, lat: state.currentLat, lon: state.currentLon };
  } else {
    state.interruptedState = null;
  }
  state.controlMode = "RETURNING_TO_BASE";
};

export const checkRTLRequired = (state) => {
  if (state.isCharging || state.controlMode === "RETURNING_TO_BASE" || state.controlMode === "RESUMING_MISSION") return;
  const speedFactor = Math.max(10, state.speedLimitPercent) / 100;
  const timeToReachBase = calculateDistanceMeters(state.currentLat, state.currentLon, state.BASE_LAT, state.BASE_LON) / ((0.0002 * speedFactor) * 111000 || 1);
  const batteryNeededForRTL = (timeToReachBase * (0.2 + 0.5 + (speedFactor * 0.5))) + 5;
  if (state.battery > 0 && state.battery <= batteryNeededForRTL) {
    executeRTLSequence(state);
  }
};

const handleBaseCharging = (state) => {
  const generatedThisTick = 5;
  state.battery += generatedThisTick;
  if (state.battery >= 100) {
    state.battery = 100;
    state.isCharging = false;
    if (state.interruptedState) {
      state.controlMode = "RESUMING_MISSION";
    }
  }
  return { consumedThisTick: 0, generatedThisTick };
};

export const calculateTickConsumption = (state) => {
  if (state.isPaused) return 0.1;
  const movingGasto = Number.parseFloat(state.speed) > 0 ? (1.5 + ((state.speedLimitPercent / 100) * 1.5)) : 0;
  return 0.2 + movingGasto;
};

const triggerFailsafeBattery = (state) => {
  state.battery = 0;
  state.isCharging = true;
  state.currentLat = state.BASE_LAT;
  state.currentLon = state.BASE_LON;
  state.controlMode = "MANUAL";
  state.interruptedState = null;
};

const handleFieldDischarging = (state, currentRadiation) => {
  const generatedThisTick = currentRadiation * SOLAR_EFFICIENCY;
  const consumedThisTick = calculateTickConsumption(state);
  state.battery = state.battery - consumedThisTick + generatedThisTick;
  if (state.battery <= 0) {
    triggerFailsafeBattery(state);
  }
  return { consumedThisTick, generatedThisTick };
};

export const updateBatteryState = (state) => {
  const currentRadiation = calculateSolarRadiation(new Date());
  let tickData;
  if (state.isCharging) {
    tickData = handleBaseCharging(state);
  } else {
    tickData = handleFieldDischarging(state, currentRadiation);
  }
  state.battery = Math.max(0, Math.min(100, state.battery));
  state.accumulatedConsumed += tickData.consumedThisTick;
  state.accumulatedGenerated += tickData.generatedThisTick;
};
