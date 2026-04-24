// server/simulator.js
import crypto from "node:crypto"; 
import { pool } from "./config/db.js";
import * as turf from "@turf/turf";

const MOVEMENT_INTERVAL = 1000;
const SENSOR_INTERVAL = 5000;
const ENERGY_LOG_INTERVAL = 5000; 
const MAX_HISTORY_RECORDS = 1000;

// --- CONSTANTES FÍSICAS DEL ROBOT ---
const SOLAR_EFFICIENCY = 0.005; 
const IDLE_CHARGE_THRESHOLD = 30; // Segundos de inactividad total para forzar rescate
const BASE_CHARGE_DELAY = 5;      // Segundos aparcado en la base antes de enchufarse

// COORDENADAS FIJAS DE LA BASE DE CARGA
const BASE_LAT = 42.36317;
const BASE_LON = -3.69882;

let currentLat = BASE_LAT;
let currentLon = BASE_LON;
let battery = 100;
let isCharging = false; 
let heading = 0;
let speed = 0;
let baseIdleCounter = 0; 
let idleTicksCounter = 0;

let controlMode = "MANUAL"; // MANUAL, AUTO, NAVIGATING, RETURNING_TO_BASE, RESUMING_MISSION
let manualVelocity = { x: 0, y: 0 };

let navTarget = null;
let navQueue = [];
let speedLimitPercent = 50;

let safeZonePolygon = null;
let autoPath = [];
let currentPathIndex = 0;

let isPaused = false;
let interruptedState = null;

let accumulatedConsumed = 0;
let accumulatedGenerated = 0;

// --- UTILIDADES ---
const getSecureRandom = () => crypto.randomBytes(4).readUInt32LE(0) / (0xffffffff + 1);

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
};

const isPointInPolygon = (lat, lon, vs) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const intersect = ((vs[i][1] > lon) !== (vs[j][1] > lon)) && (lat < (vs[j][0] - vs[i][0]) * (lon - vs[i][1]) / (vs[j][1] - vs[i][1]) + vs[i][0]);
    if (intersect) inside = !inside;
  }
  return inside;
};

// --- ALGORITMO DE RUTAS ---
const calculateBestAngle = (zone) => {
  let maxDist = 0;
  let bestAngle = 0;
  for (let i = 0; i < zone.length; i++) {
    const p1 = zone[i];
    const p2 = zone[(i + 1) % zone.length];
    const dist = Math.hypot((p2[0] - p1[0]), (p2[1] - p1[1]));
    if (dist > maxDist) {
      maxDist = dist;
      bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
    }
  }
  return bestAngle;
};

const weavePathRows = (rows) => {
  const finalPath = [];
  const sortedKeys = Object.keys(rows).sort((a, b) => a.localeCompare(b)).reverse();
  sortedKeys.forEach((key, index) => {
    const row = rows[key].sort((a, b) => a.lon - b.lon);
    if (index % 2 !== 0) row.reverse();
    finalPath.push(...row);
  });
  return finalPath;
};

export const generateCoveragePath = (zone) => {
  try {
    if (!zone || zone.length < 3) return [];
    const finalPath = [...zone.map(p => ({ lat: p[0], lon: p[1] })), { lat: zone[0][0], lon: zone[0][1] }];
    
    const turfCoords = zone.map(p => [p[1], p[0]]);
    if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0]) turfCoords.push(turfCoords[0]);
    
    const poly = turf.polygon([turfCoords]);
    const bestAngle = calculateBestAngle(zone);
    const rotatedPoly = turf.transformRotate(poly, -bestAngle);
    
    const pointGrid = turf.pointGrid(turf.bbox(rotatedPoly), 0.008, { units: 'kilometers', mask: rotatedPoly });
    const internalPoints = pointGrid.features.map(f => {
      const pt = turf.transformRotate(f, bestAngle);
      return { lat: pt.geometry.coordinates[1], lon: pt.geometry.coordinates[0] };
    });

    const validatedPoints = internalPoints.filter(p => isPointInPolygon(p.lat, p.lon, zone));
    const rows = {};
    validatedPoints.forEach(p => {
      const key = p.lat.toFixed(5);
      if (!rows[key]) rows[key] = [];
      rows[key].push(p);
    });

    return [...finalPath, ...weavePathRows(rows)];
  } catch (error) {
    console.error("Error en algoritmo de cobertura:", error);
    return [];
  }
};

// --- MÁQUINA DE ESTADOS DE NAVEGACIÓN ---
const getSystemStatus = (isChargingNow, currentSpeedNow) => {
  if (isChargingNow) return "CHARGING";
  if (controlMode === "RETURNING_TO_BASE") return "RTL_ACTIVE";
  if (controlMode === "RESUMING_MISSION") return "RESUMING";
  return currentSpeedNow > 0 ? "WORKING" : "IDLE";
};

const handleAutoMode = (lat, lon, speedFactor) => {
  if (autoPath.length === 0 || currentPathIndex >= autoPath.length) return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  
  const target = autoPath[currentPathIndex];
  const distLat = target.lat - lat;
  const distLon = target.lon - lon;
  const distance = Math.hypot(distLat, distLon);
  const workSpeed = 0.0001 * speedFactor;

  if (distance <= workSpeed) {
    currentPathIndex++;
    if (currentPathIndex >= autoPath.length) controlMode = "MANUAL";
    return { nextLat: target.lat, nextLon: target.lon, dLat: 0, dLon: 0 };
  }
  const ratio = workSpeed / distance;
  return { nextLat: lat + distLat * ratio, nextLon: lon + distLon * ratio, dLat: distLat * ratio, dLon: distLon * ratio };
};

const advanceNavQueue = (isSystemOverride) => {
  if (!isSystemOverride && navQueue.length > 0) {
    navTarget = navQueue.shift();
  } else if (!isSystemOverride) { 
    controlMode = "MANUAL"; 
    navTarget = null; 
  }
};

const getTargetCoordinates = (customLat, customLon, currentL, currentLo) => {
  if (customLat !== undefined && customLon !== undefined) return { tLat: customLat, tLon: customLon };
  if (navTarget) return { tLat: navTarget.lat, tLon: navTarget.lon };
  return { tLat: currentL, tLon: currentLo };
};

const handleNavigatingMode = (lat, lon, speedFactor, customTargetLat, customTargetLon, isSystemOverride = false) => {
  const { tLat, tLon } = getTargetCoordinates(customTargetLat, customTargetLon, lat, lon);
  
  if (!isSystemOverride && !navTarget && navQueue.length > 0) {
    navTarget = navQueue.shift();
    return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  }

  const distLat = tLat - lat;
  const distLon = tLon - lon;
  const distance = Math.hypot(distLat, distLon);
  const navSpeed = 0.0002 * speedFactor; 

  if (distance <= navSpeed) {
    advanceNavQueue(isSystemOverride);
    return { nextLat: tLat, nextLon: tLon, dLat: 0, dLon: 0, reached: true };
  }
  const ratio = navSpeed / distance;
  return { nextLat: lat + distLat * ratio, nextLon: lon + distLon * ratio, dLat: distLat * ratio, dLon: distLon * ratio, reached: false };
};

const handleRtlMode = (lat, lon, speedFactor) => {
  const result = handleNavigatingMode(lat, lon, Math.max(0.5, speedFactor), BASE_LAT, BASE_LON, true);
  if (result.reached) {
    console.log("🛬 Robot ha llegado a la base. Esperando para cargar...");
    speed = 0;
  }
  return result;
};

const handleResumingMode = (lat, lon, speedFactor) => {
  if (!interruptedState) return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  const result = handleNavigatingMode(lat, lon, Math.max(0.5, speedFactor), interruptedState.lat, interruptedState.lon, true);
  if (result.reached) {
    console.log("📍 Punto de interrupción alcanzado. Restaurando contexto...");
    controlMode = interruptedState.mode;
    currentPathIndex = interruptedState.autoPathIndex;
    interruptedState = null;
  }
  return result;
};

// 🚜 --- FÍSICA MODO MANUAL (TANQUE / COCHE) ---
const handleManualMode = (lat, lon, speedFactor) => {
  // 1. Giro sobre eje
  if (manualVelocity.x !== 0) {
    heading = (heading + (manualVelocity.x * 15)) % 360;
    if (heading < 0) heading += 360;
  }
  // Si no hay acelerador, no hay avance
  if (manualVelocity.y === 0) {
    return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  }
  // 2. Tracción (positiva para avanzar, negativa para marcha atrás)
  const baseSpeed = 0.00015 * speedFactor;
  const driveForce = manualVelocity.y * baseSpeed; 
  // 3. Trigonometría
  const headingRad = heading * (Math.PI / 180);
  const dLat = Math.cos(headingRad) * driveForce;
  const dLon = Math.sin(headingRad) * driveForce;

  return { nextLat: lat + dLat, nextLon: lon + dLon, dLat: dLat, dLon: dLon };
};

const calculateNextPosition = (lat, lon, speedFactor) => {
  switch(controlMode) {
    case "AUTO": return handleAutoMode(lat, lon, speedFactor);
    case "NAVIGATING": return handleNavigatingMode(lat, lon, speedFactor);
    case "RETURNING_TO_BASE": return handleRtlMode(lat, lon, speedFactor);
    case "RESUMING_MISSION": return handleResumingMode(lat, lon, speedFactor);
    case "MANUAL": default: return handleManualMode(lat, lon, speedFactor);
  }
};

// 🔌 --- LÓGICAS DE CARGA E INACTIVIDAD ---
const checkBaseProximityForCharge = () => {
  const distToBase = calculateDistanceMeters(currentLat, currentLon, BASE_LAT, BASE_LON);

  if (Number(speed) === 0 && !isCharging && distToBase <= 3) {
      baseIdleCounter++;
      if (baseIdleCounter >= BASE_CHARGE_DELAY) {
          isCharging = true;
          currentLat = BASE_LAT; 
          currentLon = BASE_LON;
          baseIdleCounter = 0;
          idleTicksCounter = 0;
          
          if (controlMode === "RETURNING_TO_BASE") {
            controlMode = interruptedState ? "RESUMING_MISSION" : "MANUAL";
          }
      }
  } else {
      baseIdleCounter = 0;
  }
};

const checkIdleAutoCharge = () => {
  if (controlMode === "MANUAL" && Number(speed) === 0 && !isCharging) {
      idleTicksCounter++;
      if (idleTicksCounter >= IDLE_CHARGE_THRESHOLD) {
          console.log("⏱️ Timeout de inactividad superado. Robot en modo de auto-carga de rescate.");
          isCharging = true;
          currentLat = BASE_LAT;
          currentLon = BASE_LON;
          idleTicksCounter = 0;
          baseIdleCounter = 0;
      }
  } else {
      idleTicksCounter = 0;
  }
};

// --- GESTIÓN DE ENERGÍA Y RTL ---
export const calculateSolarRadiation = (dateObj) => {
  const hour = dateObj.getHours() + (dateObj.getMinutes() / 60);
  if (hour < 6 || hour > 20) return 0; 
  const radiationWave = Math.sin(Math.PI * (hour - 6) / 14); 
  return Math.max(0, radiationWave * 1000); 
};

const executeRTLSequence = () => {
  console.log(`⚠️ ALERTA RTL: Batería Crítica. Iniciando Retorno Autónomo.`);
  if (controlMode === "AUTO" || controlMode === "NAVIGATING") {
    interruptedState = { mode: controlMode, autoPathIndex: currentPathIndex, lat: currentLat, lon: currentLon };
  } else {
    interruptedState = null;
  }
  controlMode = "RETURNING_TO_BASE";
};

const checkRTLRequired = () => {
  if (isCharging || controlMode === "RETURNING_TO_BASE" || controlMode === "RESUMING_MISSION") return;

  const speedFactor = Math.max(10, speedLimitPercent) / 100;
  const timeToReachBase = calculateDistanceMeters(currentLat, currentLon, BASE_LAT, BASE_LON) / ((0.0002 * speedFactor) * 111000 || 1); 
  const batteryNeededForRTL = (timeToReachBase * (0.2 + 0.5 + (speedFactor * 0.5))) + 5;

  if (battery > 0 && battery <= batteryNeededForRTL) {
    executeRTLSequence();
  }
};

const handleBaseCharging = () => {
  const generatedThisTick = 5; 
  battery += generatedThisTick;
  if (battery >= 100) { 
    battery = 100; 
    isCharging = false; 
    if (interruptedState) {
      console.log("🔋 Batería 100%. Desplegando hacia interrupción...");
      controlMode = "RESUMING_MISSION";
    }
  }
  return { consumedThisTick: 0, generatedThisTick };
};

const calculateTickConsumption = () => {
  if (isPaused) return 0.1; // Consumo mínimo (solo el "cerebro" encendido)
  const movingGasto = Number.parseFloat(speed) > 0 
    ? (1.5 + ((speedLimitPercent / 100) * 1.5)) 
    : 0;
  return 0.2 + movingGasto; 
};

const triggerFailsafeBattery = () => {
  battery = 0;
  isCharging = true;
  currentLat = BASE_LAT;
  currentLon = BASE_LON;
  controlMode = "MANUAL";
  interruptedState = null;
  console.error("☠️ Falla Crítica de Energía. Rescate a base.");
};

const handleFieldDischarging = (currentRadiation) => {
  const generatedThisTick = currentRadiation * SOLAR_EFFICIENCY;
  const consumedThisTick = calculateTickConsumption();
  
  battery = battery - consumedThisTick + generatedThisTick;
  
  if (battery <= 0) {
    triggerFailsafeBattery();
  }
  return { consumedThisTick, generatedThisTick };
};

const updateBatteryState = () => {
  const currentRadiation = calculateSolarRadiation(new Date());
  let tickData;
  
  if (isCharging) {
    tickData = handleBaseCharging();
  } else {
    tickData = handleFieldDischarging(currentRadiation);
  }
  
  battery = Math.max(0, Math.min(100, battery));
  accumulatedConsumed += tickData.consumedThisTick;
  accumulatedGenerated += tickData.generatedThisTick;
};

// --- GEOFENCING Y FÍSICAS ---
const applyGeofencing = (cLat, cLon, nLat, nLon) => {
  if (!safeZonePolygon || safeZonePolygon.length < 3) return { validLat: nLat, validLon: nLon };
  if (nLat === cLat && nLon === cLon) return { validLat: nLat, validLon: nLon };
  if (!isPointInPolygon(nLat, nLon, safeZonePolygon)) return { validLat: cLat, validLon: cLon };
  return { validLat: nLat, validLon: nLon };
};

const updateSpeedAndHeading = (cLat, cLon, nLat, nLon, dLat, dLon) => {
  if (Math.abs(nLat - cLat) > 0 || Math.abs(nLon - cLon) > 0 || Math.abs(dLat) > 0) {
    if (controlMode !== "MANUAL") {
        if (Math.abs(dLat) > 0 || Math.abs(dLon) > 0) {
        heading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
        }
    }
    speed = (Math.hypot(nLat - cLat, nLon - cLon) * 100000).toFixed(2);
  } else {
    speed = 0;
  }
};

// --- MÉTODOS EXPORTADOS ---
export const setSpeedLimit = (limit) => { speedLimitPercent = limit; };
export const queueNavPoint = (point) => { navQueue.push(point); };
export const clearNavQueue = () => { navQueue = []; };
export const setSimulationZone = (zone) => { safeZonePolygon = zone; autoPath = generateCoveragePath(zone); currentPathIndex = 0; };
export const clearSimulationZone = () => { safeZonePolygon = null; autoPath = []; currentPathIndex = 0; };

export const setRobotMode = (mode) => {
  if (controlMode === "RETURNING_TO_BASE" || controlMode === "RESUMING_MISSION") {
    interruptedState = null; 
  }
  controlMode = mode;
  if (mode === "AUTO" && (!autoPath || autoPath.length === 0) && safeZonePolygon) { 
    autoPath = generateCoveragePath(safeZonePolygon); 
    currentPathIndex = 0; 
  }
  if (mode === "MANUAL") {
    manualVelocity = { x: 0, y: 0 };
  }
};

export const setManualVelocity = (vx, vy) => { 
  if (controlMode === "MANUAL") {
    manualVelocity = { x: vx, y: vy }; 
  }
};

export const setNavigationTarget = (lat, lon, clearQueue = false) => { 
  navTarget = { lat, lon }; 
  if (clearQueue) navQueue = []; 
  controlMode = "NAVIGATING"; 
};

export const pauseSimulation = () => { isPaused = true; speed = 0; };
export const resumeSimulation = () => { isPaused = false; };
export const cancelSimulation = () => { 
  isPaused = false; 
  safeZonePolygon = null; 
  autoPath = []; 
  currentPathIndex = 0; 
  controlMode = "MANUAL"; 
  navTarget = null; 
  navQueue = []; 
  interruptedState = null; 
  speed = 0; 
};

// --- PROCESAMIENTO PRINCIPAL DE TICKS ---
const processMovementTick = async (io) => {
  checkRTLRequired();
  checkIdleAutoCharge(); 
  checkBaseProximityForCharge();
  updateBatteryState();

  if (!isCharging && !isPaused) {
    const { nextLat, nextLon, dLat, dLon } = calculateNextPosition(currentLat, currentLon, speedLimitPercent / 100);
    const { validLat, validLon } = applyGeofencing(currentLat, currentLon, nextLat, nextLon);
    updateSpeedAndHeading(currentLat, currentLon, validLat, validLon, dLat, dLon);
    currentLat = validLat;
    currentLon = validLon;
  } else if (isPaused) { 
    speed = 0; 
  }

  const currentSystemStatus = isPaused ? "PAUSED" : getSystemStatus(isCharging, speed);

  const radiacion = calculateSolarRadiation(new Date());
  const solarInput = radiacion * SOLAR_EFFICIENCY; 
  const consumoActual = isCharging ? 0 : calculateTickConsumption(); 

  try {
    await pool.query(
      `UPDATE robot_estado SET current_lat = $1, current_lon = $2, battery_percentage = $3, battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7 WHERE id = 1`,
      [currentLat, currentLon, Math.round(battery), isCharging ? "CHARGING" : "IDLE", currentSystemStatus, speed, Math.round(heading)]
    );

    if (io) {
      io.emit("robot:status", {
        battery: { 
          percentage: Math.round(battery), 
          status: isCharging ? "CHARGING" : "IDLE", 
          voltage: 12.5, 
          temperature: 35, 
          timeRemaining: isCharging ? "Cargando..." : `${Math.round(battery * 1.5)} min`,
          solarInput: solarInput, 
          consumption: consumoActual
        },
        position: { lat: currentLat, lon: currentLon },
        system: { speed: speed, heading: Math.round(heading), status: currentSystemStatus, mode: controlMode, speedLimit: speedLimitPercent, target: navTarget, queue: navQueue }
      });
    }
  } catch (error) { 
    console.error("Error estado:", error.message); 
  }
};

const processEnergyTick = async () => {
  const currentStatus = isPaused ? "PAUSED" : getSystemStatus(isCharging, speed);
  const logConsumed = accumulatedConsumed;
  const logGenerated = accumulatedGenerated;
  accumulatedConsumed = 0; 
  accumulatedGenerated = 0;

  try {
    await pool.query(
      `INSERT INTO historial_energia (bateria_porcentaje, estado, radiacion_solar, energia_consumida, energia_generada) VALUES ($1, $2, $3, $4, $5)`,
      [battery.toFixed(2), currentStatus, calculateSolarRadiation(new Date()).toFixed(2), logConsumed.toFixed(4), logGenerated.toFixed(4)]
    );
    await pool.query(`DELETE FROM historial_energia WHERE id NOT IN (SELECT id FROM historial_energia ORDER BY timestamp DESC LIMIT $1)`, [MAX_HISTORY_RECORDS]);
  } catch (err) { 
    console.error("Error Tick Energía:", err.message); 
  }
};

const getActiveMissionContext = async () => {
  if (controlMode !== "AUTO") {
    return { id: null, name: null };
  }
  const res = await pool.query(`SELECT e.id, m.nombre FROM ejecuciones_mision e JOIN misiones m ON e.mision_id = m.id WHERE e.estado IN ('en_curso', 'ejecutando', 'activa') ORDER BY e.id DESC LIMIT 1`);
  if (res.rows.length > 0) {
    return { id: res.rows[0].id, name: res.rows[0].nombre };
  }
  return { id: null, name: null };
};

const shouldSkipAgronomy = () => {
  if (isCharging) return true;
  if (isPaused) return true;
  if (Number.parseFloat(speed) === 0) return true;
  if (controlMode === "RETURNING_TO_BASE") return true;
  if (controlMode === "RESUMING_MISSION") return true;
  return false;
};

const processAgronomicTick = async (io) => {
  if (shouldSkipAgronomy()) {
    return;
  }

  const intensity = (Math.sin(currentLat * 15000) + Math.cos(currentLon * 15000) + 2) / 4;
  const cHum = Math.max(0, Math.min(100, (20 + (intensity * 70)) + (getSecureRandom() * 4 - 2)));
  const cPh = Math.max(4, Math.min(10, (5 + (intensity * 3)) + (getSecureRandom() * 0.4 - 0.2)));
  const cTemp = (15 + (intensity * 20)) + (getSecureRandom() * 1 - 0.5);

  try {
    const missionCtx = await getActiveMissionContext();
    const newRecord = await pool.query(
      `INSERT INTO robot_datos (lat, lon, humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar, ejecucion_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [currentLat, currentLon, cHum.toFixed(1), cTemp.toFixed(1), cPh.toFixed(1), (20 + getSecureRandom() * 60).toFixed(2), (15 + getSecureRandom() * 45).toFixed(2), (100 + getSecureRandom() * 150).toFixed(2), calculateSolarRadiation(new Date()).toFixed(2), missionCtx.id]
    );

    if (io && newRecord.rows[0]) {
      io.emit("robot:new_data", { ...newRecord.rows[0], nombre_mision: missionCtx.name });
    }
    
    await pool.query(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, [MAX_HISTORY_RECORDS]);
  } catch (error) { 
    console.error("Error datos:", error.message); 
  }
};

export const startRobotSimulation = (io) => {
  console.log("🤖 Simulador: ACTIVADO (Completo)");
  setInterval(() => processMovementTick(io), MOVEMENT_INTERVAL);
  setInterval(() => processEnergyTick(), ENERGY_LOG_INTERVAL);
  setInterval(() => processAgronomicTick(io), SENSOR_INTERVAL);
};