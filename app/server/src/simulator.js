import crypto from "node:crypto"; 
import { prisma } from "./config/db.js";
import * as turf from "@turf/turf";

const MOVEMENT_INTERVAL = 1000;
const SENSOR_INTERVAL = 5000;
const ENERGY_LOG_INTERVAL = 5000; 
const MAX_HISTORY_RECORDS = 1000;

const SOLAR_EFFICIENCY = 0.005; 
const IDLE_CHARGE_THRESHOLD = 30; 
const BASE_CHARGE_DELAY = 5;      

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

let controlMode = "MANUAL"; 
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

/**
 * Genera un número aleatorio seguro para que los datos simulados de los sensores no se repitan de forma predecible.
 * @returns {number} Valor entre 0 y 1.
 */
const getSecureRandom = () => crypto.randomBytes(4).readUInt32LE(0) / (0xffffffff + 1);

/**
 * Calcula la distancia en metros entre dos puntos del mapa (teniendo en cuenta la curvatura de la Tierra).
 * @param {number} lat1 - Latitud de origen.
 * @param {number} lon1 - Longitud de origen.
 * @param {number} lat2 - Latitud de destino.
 * @param {number} lon2 - Longitud de destino.
 * @returns {number} Distancia en metros.
 */
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
};

/**
 * Comprueba si el robot se encuentra dentro de la zona de trabajo dibujada en el mapa.
 * @param {number} lat - Latitud actual.
 * @param {number} lon - Longitud actual.
 * @param {Array<Array<number>>} vs - Puntos que forman el límite de la zona.
 * @returns {boolean} Verdadero si está dentro.
 */
const isPointInPolygon = (lat, lon, vs) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const intersect = ((vs[i][1] > lon) !== (vs[j][1] > lon)) && (lat < (vs[j][0] - vs[i][0]) * (lon - vs[i][1]) / (vs[j][1] - vs[i][1]) + vs[i][0]);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Encuentra el lado más largo de la parcela para que el robot haga sus pasadas en esa misma dirección.
 * @param {Array<Array<number>>} zone - Puntos del límite de la parcela.
 * @returns {number} Dirección en grados.
 */
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

/**
 * Ordena los puntos del terreno para que el robot haga un recorrido de barrido continuo (serpentina).
 * @param {Object} rows - Puntos agrupados por filas.
 * @returns {Array<Object>} Ruta ordenada paso a paso.
 */
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

/**
 * Calcula automáticamente la ruta que debe seguir el robot para cubrir toda la zona de trabajo.
 * @param {Array<Array<number>>} zone - Coordenadas del área de trabajo.
 * @returns {Array<Object>} Lista de puntos por los que pasará el robot.
 */
export const generateCoveragePath = (zone) => {
  try {
    if (!zone || zone.length < 3) return [];
    const finalPath = [...zone.map(p => ({ lat: p[0], lon: p[1] })), { lat: zone[0][0], lon: zone[0][1] }];
    
    const turfCoords = zone.map(p => [p[1], p[0]]);
    if (turfCoords[0][0] !== turfCoords.at(-1)[0]) turfCoords.push(turfCoords[0]);
    
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
    console.error("[Simulador] Error al calcular la ruta automática:", error);
    return [];
  }
};

/**
 * Devuelve el estado general actual del robot.
 * @param {boolean} isChargingNow - ¿Está enchufado en la base?
 * @param {number} currentSpeedNow - Velocidad actual.
 * @returns {string} Estado (working, idle, charging, etc).
 */
const getSystemStatus = (isChargingNow, currentSpeedNow) => {
  if (isChargingNow) return "CHARGING";
  if (controlMode === "RETURNING_TO_BASE") return "RTL_ACTIVE";
  if (controlMode === "RESUMING_MISSION") return "RESUMING";
  return currentSpeedNow > 0 ? "WORKING" : "IDLE";
};

/**
 * Controla el movimiento cuando el robot está en una misión automática, guiándolo punto a punto.
 */
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

/**
 * Avanza al siguiente punto de destino que el usuario ordenó manualmente en el mapa.
 */
const advanceNavQueue = () => {
  if (navQueue.length > 0) {
    navTarget = navQueue.shift();
  } else { 
    controlMode = "MANUAL"; 
    navTarget = null; 
  }
};

/**
 * Función matemática pura: Mueve el robot desde su posición actual hacia un destino específico.
 * Devuelve un aviso ('reached') si ha llegado en este turno.
 */
const moveTowardsTarget = (lat, lon, tLat, tLon, speedFactor) => {
  const distLat = tLat - lat;
  const distLon = tLon - lon;
  const distance = Math.hypot(distLat, distLon);
  const navSpeed = 0.0002 * speedFactor; 

  if (distance <= navSpeed) {
    return { nextLat: tLat, nextLon: tLon, dLat: 0, dLon: 0, reached: true };
  }
  const ratio = navSpeed / distance;
  return { nextLat: lat + distLat * ratio, nextLon: lon + distLon * ratio, dLat: distLat * ratio, dLon: distLon * ratio, reached: false };
};

/**
 * Mueve el robot hacia los puntos que el usuario hizo clic en el mapa.
 */
const handleNavigatingMode = (lat, lon, speedFactor) => {
  const tLat = navTarget ? navTarget.lat : lat;
  const tLon = navTarget ? navTarget.lon : lon;
  
  if (!navTarget && navQueue.length > 0) {
    navTarget = navQueue.shift();
    return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  }

  const result = moveTowardsTarget(lat, lon, tLat, tLon, speedFactor);
  if (result.reached) {
    advanceNavQueue();
  }
  return result;
};

/**
 * Devuelve el robot automáticamente en línea recta a su base de carga.
 */
const handleRtlMode = (lat, lon, speedFactor) => {
  const result = moveTowardsTarget(lat, lon, BASE_LAT, BASE_LON, Math.max(0.5, speedFactor));
  if (result.reached) {
    console.log("[Simulador] El robot ha llegado a la base. Preparando para recargar.");
    speed = 0;
  }
  return result;
};

/**
 * Devuelve el robot al punto exacto donde estaba antes de interrumpirse su trabajo.
 */
const handleResumingMode = (lat, lon, speedFactor) => {
  if (!interruptedState) return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  const result = moveTowardsTarget(lat, lon, interruptedState.lat, interruptedState.lon, Math.max(0.5, speedFactor));
  if (result.reached) {
    console.log("[Simulador] El robot alcanzó el punto donde se interrumpió la misión. Reanudando el trabajo.");
    controlMode = interruptedState.mode;
    currentPathIndex = interruptedState.autoPathIndex;
    interruptedState = null;
  }
  return result;
};

/**
 * Calcula el movimiento del robot cuando es controlado manualmente con el mando direccional del frontend.
 */
const handleManualMode = (lat, lon, speedFactor) => {
  if (manualVelocity.x !== 0) {
    heading = (heading + (manualVelocity.x * 15)) % 360;
    if (heading < 0) heading += 360;
  }
  if (manualVelocity.y === 0) {
    return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  }
  const baseSpeed = 0.00015 * speedFactor;
  const driveForce = manualVelocity.y * baseSpeed; 
  const headingRad = heading * (Math.PI / 180);
  const dLat = Math.cos(headingRad) * driveForce;
  const dLon = Math.sin(headingRad) * driveForce;

  return { nextLat: lat + dLat, nextLon: lon + dLon, dLat: dLat, dLon: dLon };
};

/**
 * Función principal que decide qué tipo de movimiento debe hacer el robot en base a su modo de control actual.
 */
const calculateNextPosition = (lat, lon, speedFactor) => {
  switch(controlMode) {
    case "AUTO": return handleAutoMode(lat, lon, speedFactor);
    case "NAVIGATING": return handleNavigatingMode(lat, lon, speedFactor);
    case "RETURNING_TO_BASE": return handleRtlMode(lat, lon, speedFactor);
    case "RESUMING_MISSION": return handleResumingMode(lat, lon, speedFactor);
    case "MANUAL": default: return handleManualMode(lat, lon, speedFactor);
  }
};

/**
 * Conecta el robot a la base automáticamente si se queda parado cerca de ella unos segundos.
 */
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

/**
 * Sistema de seguridad: Si dejamos el robot olvidado en modo manual sin hacer nada por un tiempo, se va a cargar solo.
 */
const checkIdleAutoCharge = () => {
  if (controlMode === "MANUAL" && Number(speed) === 0 && !isCharging) {
      idleTicksCounter++;
      if (idleTicksCounter >= IDLE_CHARGE_THRESHOLD) {
          console.log("[Simulador] El robot lleva mucho tiempo inactivo. Volviendo a la base por seguridad.");
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

/**
 * Simula cuánta luz solar hay dependiendo de la hora del día (más luz a mediodía, nada por la noche).
 * @param {Date} dateObj - Fecha y hora actuales.
 * @returns {number} Nivel de radiación solar simulada.
 */
export const calculateSolarRadiation = (dateObj) => {
  const hour = dateObj.getHours() + (dateObj.getMinutes() / 60);
  if (hour < 6 || hour > 20) return 0; 
  const radiationWave = Math.sin(Math.PI * (hour - 6) / 14); 
  return Math.max(0, radiationWave * 1000); 
};

/**
 * Guarda en memoria lo que estaba haciendo el robot antes de mandarlo de vuelta a la base por falta de batería.
 */
const executeRTLSequence = () => {
  console.log(`[Simulador] Batería crítica. Abortando trabajo para volver a base y recargar.`);
  if (controlMode === "AUTO" || controlMode === "NAVIGATING") {
    interruptedState = { mode: controlMode, autoPathIndex: currentPathIndex, lat: currentLat, lon: currentLon };
  } else {
    interruptedState = null;
  }
  controlMode = "RETURNING_TO_BASE";
};

/**
 * Comprueba cuánta batería queda y a qué distancia está la base para decidir si el robot debe volver a recargar antes de morir en el campo.
 */
const checkRTLRequired = () => {
  if (isCharging || controlMode === "RETURNING_TO_BASE" || controlMode === "RESUMING_MISSION") return;

  const speedFactor = Math.max(10, speedLimitPercent) / 100;
  const timeToReachBase = calculateDistanceMeters(currentLat, currentLon, BASE_LAT, BASE_LON) / ((0.0002 * speedFactor) * 111000 || 1); 
  const batteryNeededForRTL = (timeToReachBase * (0.2 + 0.5 + (speedFactor * 0.5))) + 5;

  if (battery > 0 && battery <= batteryNeededForRTL) {
    executeRTLSequence();
  }
};

/**
 * Recarga la batería rápidamente cuando el robot está conectado a la base.
 */
const handleBaseCharging = () => {
  const generatedThisTick = 5; 
  battery += generatedThisTick;
  if (battery >= 100) { 
    battery = 100; 
    isCharging = false; 
    if (interruptedState) {
      console.log("[Simulador] Carga completa. Reanudando trabajo pendiente.");
      controlMode = "RESUMING_MISSION";
    }
  }
  return { consumedThisTick: 0, generatedThisTick };
};

/**
 * Calcula cuánta batería está gastando el robot en función de lo rápido que se mueve.
 */
const calculateTickConsumption = () => {
  if (isPaused) return 0.1; 
  const movingGasto = Number.parseFloat(speed) > 0 
    ? (1.5 + ((speedLimitPercent / 100) * 1.5)) 
    : 0;
  return 0.2 + movingGasto; 
};

/**
 * Apagado de emergencia: Si nos quedamos sin batería en medio de la nada, fuerza un rescate automático llevándolo a la base.
 */
const triggerFailsafeBattery = () => {
  battery = 0;
  isCharging = true;
  currentLat = BASE_LAT;
  currentLon = BASE_LON;
  controlMode = "MANUAL";
  interruptedState = null;
  console.error("[Simulador] Nos quedamos completamente sin batería. Forzando rescate a la base.");
};

/**
 * Calcula si la batería baja o sube equilibrando el consumo de las ruedas vs la generación del panel solar.
 */
const handleFieldDischarging = (currentRadiation) => {
  const generatedThisTick = currentRadiation * SOLAR_EFFICIENCY;
  const consumedThisTick = calculateTickConsumption();
  
  battery = battery - consumedThisTick + generatedThisTick;
  
  if (battery <= 0) {
    triggerFailsafeBattery();
  }
  return { consumedThisTick, generatedThisTick };
};

/**
 * Actualiza la batería del robot y registra lo que se consumió/generó para las estadísticas.
 */
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

/**
 * Sistema de barrera virtual. Impide que el robot salga de la zona permitida, actuando como un muro invisible.
 * Solo le permite volver a entrar si, por lo que sea, está fuera.
 * @param {number} cLat - Latitud actual.
 * @param {number} cLon - Longitud actual.
 * @param {number} nLat - Latitud a la que quiere ir.
 * @param {number} nLon - Longitud a la que quiere ir.
 * @returns {Object} Movimiento permitido (si choca, se queda donde está).
 */
const applyGeofencing = (cLat, cLon, nLat, nLon) => {
  if (!safeZonePolygon || safeZonePolygon.length < 3) return { validLat: nLat, validLon: nLon };
  if (nLat === cLat && nLon === cLon) return { validLat: nLat, validLon: nLon };
  
  // Apaga la barrera de seguridad si el robot necesita volver a su base de carga automáticamente
  if (controlMode !== "MANUAL") return { validLat: nLat, validLon: nLon };

  const isCurrentlyInside = isPointInPolygon(cLat, cLon, safeZonePolygon);
  if (!isCurrentlyInside) return { validLat: nLat, validLon: nLon };

  // Si el paso que va a dar lo saca de la zona segura, lo bloqueamos
  if (!isPointInPolygon(nLat, nLon, safeZonePolygon)) {
    return { validLat: cLat, validLon: cLon };
  }

  return { validLat: nLat, validLon: nLon };
};

/**
 * Actualiza la velocidad y la orientación a la que mira el robot en base a su último movimiento.
 */
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

/**
 * Es el "latido" del motor de movimiento. Se ejecuta cada segundo para procesar el movimiento, la batería y notificar a los usuarios.
 * @param {Object} io - Permite enviar datos en vivo al frontend.
 */
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

  const radiation = calculateSolarRadiation(new Date());
  const solarInput = radiation * SOLAR_EFFICIENCY; 
  const currentConsumption = isCharging ? 0 : calculateTickConsumption(); 

  try {
    await prisma.robotState.update({
      where: { id: 1 },
      data: {
        currentLat: currentLat,
        currentLon: currentLon,
        batteryPercentage: Math.round(battery),
        batteryStatus: isCharging ? "CHARGING" : "IDLE",
        systemStatus: currentSystemStatus,
        systemSpeed: speed,
        systemHeading: Math.round(heading)
      }
    });

    if (io) {
      io.emit("robot:status", {
        battery: { 
          percentage: Math.round(battery), 
          status: isCharging ? "CHARGING" : "IDLE", 
          voltage: 12.5, 
          temperature: 35, 
          timeRemaining: isCharging ? "Charging..." : `${Math.round(battery * 1.5)} min`,
          solarInput: solarInput, 
          consumption: currentConsumption
        },
        position: { lat: currentLat, lon: currentLon },
        system: { speed: speed, heading: Math.round(heading), status: currentSystemStatus, mode: controlMode, speedLimit: speedLimitPercent, target: navTarget, queue: navQueue }
      });
    }
  } catch (error) { 
    console.error("[Simulador] Problema al guardar el estado del robot:", error.message); 
  }
};

/**
 * Guarda una instantánea de la batería ocasionalmente (ej. cada 5 segundos) en la base de datos para pintar gráficos más tarde.
 */
const processEnergyTick = async () => {
  const currentStatus = isPaused ? "PAUSED" : getSystemStatus(isCharging, speed);
  const logConsumed = accumulatedConsumed;
  const logGenerated = accumulatedGenerated;
  accumulatedConsumed = 0; 
  accumulatedGenerated = 0;

  try {
    await prisma.energyHistory.create({
      data: {
        batteryPercentage: Number.parseFloat(battery.toFixed(2)),
        status: currentStatus,
        solarRadiation: Number.parseFloat(calculateSolarRadiation(new Date()).toFixed(2)),
        energyConsumed: Number.parseFloat(logConsumed.toFixed(4)),
        energyGenerated: Number.parseFloat(logGenerated.toFixed(4))
      }
    });
    // Se utiliza una consulta SQL cruda ($executeRawUnsafe) en lugar de los métodos nativos de Prisma
    // por motivos de rendimiento y optimización de memoria.
    // Hacer un borrado "LIMIT" en Prisma puro requeriría dos operaciones a la base de datos
    // (un SELECT masivo seguido de un DELETE cargando un array enorme de IDs en la RAM de Node.js).
    // Esta consulta nativa realiza la limpieza del búfer circular en una única y rapidísima transacción.
    await prisma.$executeRawUnsafe(`DELETE FROM historial_energia WHERE id NOT IN (SELECT id FROM historial_energia ORDER BY timestamp DESC LIMIT $1)`, MAX_HISTORY_RECORDS);
  } catch (err) { 
    console.error("[Simulador] Problema al guardar historial de energía:", err.message); 
  }
};

/**
 * Comprueba si hay una misión agrícola activa trabajando actualmente.
 * @returns {Promise<Object>} Datos de la misión activa.
 */
const getActiveMissionContext = async () => {
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

/**
 * Decide si debemos apagar los sensores de suelo (ej. si el robot está cargando o aparcado fuera de la parcela).
 * @returns {boolean} Verdadero si no se deben tomar lecturas.
 */
const shouldSkipAgronomy = () => {
  if (isCharging || isPaused || Number.parseFloat(speed) === 0 || controlMode === "RETURNING_TO_BASE" || controlMode === "RESUMING_MISSION") {
    return true;
  }
  if (safeZonePolygon && safeZonePolygon.length >= 3) {
    if (!isPointInPolygon(currentLat, currentLon, safeZonePolygon)) {
      return true;
    }
  }
  return false;
};

/**
 * Genera valores sintéticos para los sensores en base a la ubicación actual y los requisitos de la misión activa.
 */
const generateSensorReadings = (taskStr, lat, lon, hasActiveMission) => {
  const collectHum = !hasActiveMission || taskStr.includes("humedad") || taskStr.includes("humidity");
  const collectTemp = !hasActiveMission || taskStr.includes("temp");
  const collectPh = !hasActiveMission || taskStr.includes("ph");
  const collectNpk = !hasActiveMission || taskStr.includes("n-p-k") || taskStr.includes("npk");
  const collectRad = !hasActiveMission || taskStr.includes("rad");

  // Truco matemático para que la simulación del sensor parezca natural y varíe dependiendo de dónde pisa el robot
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

/**
 * Encargado de generar datos de sensores simulados (humedad, temperatura, ph, etc.) como si el robot estuviera leyendo terreno real.
 * @param {Object} io - Permite enviar datos en vivo al frontend.
 */
const processAgronomicTick = async (io) => {
  if (shouldSkipAgronomy()) {
    return;
  }

  try {
    const missionCtx = await getActiveMissionContext();
    const hasActiveMission = missionCtx.id !== null;
    const taskStr = missionCtx.taskType || "";

    const readings = generateSensorReadings(taskStr, currentLat, currentLon, hasActiveMission);

    const newRecord = await prisma.robotData.create({
      data: {
        lat: currentLat,
        lon: currentLon,
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
    
    // Igual que en el historial de energía, se recurre a SQL crudo
    // para limpiar la telemetría antigua y mantener el búfer circular sin penalizar la CPU del servidor.
    await prisma.$executeRawUnsafe(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, MAX_HISTORY_RECORDS);
  } catch (error) { 
    console.error("[Simulador] Problema al guardar datos agronómicos:", error.message); 
  }
};

/**
 * Inicia toda la simulación en segundo plano. Mueve el robot y genera datos constantemente.
 */
export const startRobotSimulation = (io) => {
  console.log("[Simulador] Simulación iniciada correctamente en segundo plano.");
  setInterval(() => processMovementTick(io), MOVEMENT_INTERVAL);
  setInterval(() => processEnergyTick(), ENERGY_LOG_INTERVAL);
  setInterval(() => processAgronomicTick(io), SENSOR_INTERVAL);
};