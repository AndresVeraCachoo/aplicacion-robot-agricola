import { prisma } from "../config/db.js";
import { state } from "./state.js";
import { generateCoveragePath } from "./utils.js";
import { checkRTLRequired, checkIdleAutoCharge, checkBaseProximityForCharge, updateBatteryState, calculateSolarRadiation, calculateTickConsumption } from "./systems/energy.js";
import { calculateNextPosition, applyGeofencing, updateSpeedAndHeading } from "./systems/movement.js";
import { getActiveMissionContext, shouldSkipAgronomy, generateSensorReadings } from "./systems/agronomy.js";

const MOVEMENT_INTERVAL = 1000;
const SENSOR_INTERVAL = 5000;
const ENERGY_LOG_INTERVAL = 5000; 
const MAX_HISTORY_RECORDS = 1000;

export const setSpeedLimit = (limit) => { state.speedLimitPercent = limit; };
export const queueNavPoint = (point) => { state.navQueue.push(point); };
export const setSimulationZone = (zone) => { state.safeZonePolygon = zone; state.autoPath = generateCoveragePath(zone); state.currentPathIndex = 0; };
export const clearSimulationZone = () => { state.safeZonePolygon = null; state.autoPath = []; state.currentPathIndex = 0; };

export const setRobotMode = (mode) => {
  if (state.controlMode === "RETURNING_TO_BASE" || state.controlMode === "RESUMING_MISSION") {
    state.interruptedState = null; 
  }
  state.controlMode = mode;
  if (mode === "AUTO" && (!state.autoPath || state.autoPath.length === 0) && state.safeZonePolygon) { 
    state.autoPath = generateCoveragePath(state.safeZonePolygon); 
    state.currentPathIndex = 0; 
  }
  if (mode === "MANUAL") {
    state.manualVelocity = { x: 0, y: 0 };
  }
};

export const setManualVelocity = (vx, vy) => { 
  if (state.controlMode === "MANUAL") {
    state.manualVelocity = { x: vx, y: vy }; 
  }
};

export const setNavigationTarget = (lat, lon, clearQueue = false) => { 
  state.navTarget = { lat, lon }; 
  if (clearQueue) state.navQueue = []; 
  state.controlMode = "NAVIGATING"; 
};

export const pauseSimulation = () => { state.isPaused = true; state.speed = 0; };
export const resumeSimulation = () => { state.isPaused = false; };
export const cancelSimulation = () => { 
  state.isPaused = false; 
  state.safeZonePolygon = null; 
  state.autoPath = []; 
  state.currentPathIndex = 0; 
  state.controlMode = "MANUAL"; 
  state.navTarget = null; 
  state.navQueue = []; 
  state.interruptedState = null; 
  state.speed = 0; 
};

const getSystemStatus = () => {
  if (state.isCharging) return "CHARGING";
  if (state.controlMode === "RETURNING_TO_BASE") return "RTL_ACTIVE";
  if (state.controlMode === "RESUMING_MISSION") return "RESUMING";
  return state.speed > 0 ? "WORKING" : "IDLE";
};

const processMovementTick = async (io) => {
  checkRTLRequired(state);
  checkIdleAutoCharge(state); 
  checkBaseProximityForCharge(state);
  updateBatteryState(state);

  if (!state.isCharging && !state.isPaused) {
    const { nextLat, nextLon, dLat, dLon } = calculateNextPosition(state);
    const { validLat, validLon } = applyGeofencing(state, nextLat, nextLon);
    updateSpeedAndHeading(state, validLat, validLon, dLat, dLon);
    state.currentLat = validLat;
    state.currentLon = validLon;
  } else if (state.isPaused) { 
    state.speed = 0; 
  }

  const currentSystemStatus = state.isPaused ? "PAUSED" : getSystemStatus();
  const radiation = calculateSolarRadiation(new Date());
  const solarInput = radiation * 0.005; 
  const currentConsumption = state.isCharging ? 0 : calculateTickConsumption(state); 

  try {
    await prisma.robotState.update({
      where: { id: 1 },
      data: {
        currentLat: state.currentLat,
        currentLon: state.currentLon,
        batteryPercentage: Math.round(state.battery),
        batteryStatus: state.isCharging ? "CHARGING" : "IDLE",
        systemStatus: currentSystemStatus,
        systemSpeed: state.speed,
        systemHeading: Math.round(state.heading)
      }
    });

    if (io) {
      io.emit("robot:status", {
        battery: { 
          percentage: Math.round(state.battery), 
          status: state.isCharging ? "CHARGING" : "IDLE", 
          voltage: 12.5, 
          temperature: 35, 
          timeRemaining: state.isCharging ? "Charging..." : `${Math.round(state.battery * 1.5)} min`,
          solarInput: solarInput, 
          consumption: currentConsumption
        },
        position: { lat: state.currentLat, lon: state.currentLon },
        system: { speed: state.speed, heading: Math.round(state.heading), status: currentSystemStatus, mode: state.controlMode, speedLimit: state.speedLimitPercent, target: state.navTarget, queue: state.navQueue }
      });
    }
  } catch (error) { 
    console.error(error.message); 
  }
};

const processEnergyTick = async () => {
  const currentStatus = state.isPaused ? "PAUSED" : getSystemStatus();
  const logConsumed = state.accumulatedConsumed;
  const logGenerated = state.accumulatedGenerated;
  state.accumulatedConsumed = 0; 
  state.accumulatedGenerated = 0;

  try {
    await prisma.energyHistory.create({
      data: {
        batteryPercentage: Number.parseFloat(state.battery.toFixed(2)),
        status: currentStatus,
        solarRadiation: Number.parseFloat(calculateSolarRadiation(new Date()).toFixed(2)),
        energyConsumed: Number.parseFloat(logConsumed.toFixed(4)),
        energyGenerated: Number.parseFloat(logGenerated.toFixed(4))
      }
    });
    await prisma.$executeRawUnsafe(`DELETE FROM historial_energia WHERE id NOT IN (SELECT id FROM historial_energia ORDER BY timestamp DESC LIMIT $1)`, MAX_HISTORY_RECORDS);
  } catch (err) { 
    console.error(err.message); 
  }
};

const processAgronomicTick = async (io) => {
  if (shouldSkipAgronomy(state)) {
    return;
  }

  try {
    const missionCtx = await getActiveMissionContext();
    const hasActiveMission = missionCtx.id !== null;
    const taskStr = missionCtx.taskType || "";

    const readings = generateSensorReadings(taskStr, state.currentLat, state.currentLon, hasActiveMission);

    const newRecord = await prisma.robotData.create({
      data: {
        lat: state.currentLat,
        lon: state.currentLon,
        humidity: readings.cHum === null ? null : Number.parseFloat(readings.cHum),
        soilTemperature: readings.cTemp === null ? null : Number.parseFloat(readings.cTemp),
        ph: readings.cPh === null ? null : Number.parseFloat(readings.cPh),
        nitrogen: readings.cN === null ? null : Number.parseFloat(readings.cN),
        phosphorus: readings.cP === null ? null : Number.parseFloat(readings.cP),
        potassium: readings.cK === null ? null : Number.parseFloat(readings.cK),
        solarRadiation: readings.cRad === null ? null : Number.parseFloat(readings.cRad),
        executionId: missionCtx.id
      }
    });

    if (io && newRecord) {
      io.emit("robot:new_data", { ...newRecord, missionName: missionCtx.name });
    }
    
    await prisma.$executeRawUnsafe(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, MAX_HISTORY_RECORDS);
  } catch (error) { 
    console.error(error.message); 
  }
};

export const startRobotSimulation = (io) => {
  setInterval(() => processMovementTick(io), MOVEMENT_INTERVAL);
  setInterval(() => processEnergyTick(), ENERGY_LOG_INTERVAL);
  setInterval(() => processAgronomicTick(io), SENSOR_INTERVAL);
};
