import { pool } from "./config/db.js";
import * as turf from "@turf/turf";

const MOVEMENT_INTERVAL = 1000;
const SENSOR_INTERVAL = 5000;
const MAX_HISTORY_RECORDS = 50;

let currentLat = 42.36317;
let currentLon = -3.69882;
let battery = 100;
let isCharging = false;
let heading = 0;
let speed = 0;

let currentTemp = 20;
let currentHumidity = 50;
let currentPh = 7;

let controlMode = "MANUAL";
let manualVelocity = { x: 0, y: 0 };

let navTarget = null;
let navQueue = [];

let emergencyStop = false;
let speedLimitPercent = 50;

let safeZonePolygon = null;
let autoPath = [];
let currentPathIndex = 0;

const isPointInPolygon = (lat, lon, vs) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > lon) !== (yj > lon)) && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const generateCoveragePath = (zone) => {
  try {
    if (!zone || zone.length < 3) return [];
    const finalPath = [];

    zone.forEach(p => finalPath.push({ lat: p[0], lon: p[1] }));
    finalPath.push({ lat: zone[0][0], lon: zone[0][1] });

    const turfCoords = zone.map(p => [p[1], p[0]]);
    if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0]) turfCoords.push(turfCoords[0]);
    const poly = turf.polygon([turfCoords]);

    let maxDist = 0, bestAngle = 0;
    for (let i = 0; i < zone.length; i++) {
      const p1 = zone[i], p2 = zone[(i + 1) % zone.length];
      const dist = Math.hypot((p2[0] - p1[0]), (p2[1] - p1[1]));
      if (dist > maxDist) {
        maxDist = dist;
        bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
      }
    }

    const rotatedPoly = turf.transformRotate(poly, -bestAngle);
    const bbox = turf.bbox(rotatedPoly);
    const pointGrid = turf.pointGrid(bbox, 0.008, { units: 'kilometers', mask: rotatedPoly });

    let internalPoints = pointGrid.features.map(f => {
      const rotatedPt = turf.transformRotate(f, bestAngle);
      return { lat: rotatedPt.geometry.coordinates[1], lon: rotatedPt.geometry.coordinates[0] };
    });

    const validatedPoints = internalPoints.filter(p => isPointInPolygon(p.lat, p.lon, zone));
    const rows = {};
    validatedPoints.forEach(p => {
      const key = p.lat.toFixed(5);
      if (!rows[key]) rows[key] = [];
      rows[key].push(p);
    });

    const sortedKeys = Object.keys(rows).sort((a, b) => a.localeCompare(b)).reverse();
    sortedKeys.forEach((key, index) => {
      const row = rows[key].sort((a, b) => a.lon - b.lon);
      if (index % 2 !== 0) row.reverse();
      finalPath.push(...row);
    });

    return finalPath;
  } catch (error) {
    console.error("Error en algoritmo de cobertura:", error);
    return [];
  }
};

const getSystemStatus = (charging, currentSpeed) => {
  if (charging) return "CHARGING";
  return currentSpeed > 0 ? "WORKING" : "IDLE";
};

const handleAutoMode = (lat, lon, speedFactor) => {
  if (autoPath.length === 0 || currentPathIndex >= autoPath.length) {
    return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
  }
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
  
  const dLat = (distLat / distance) * workSpeed;
  const dLon = (distLon / distance) * workSpeed;
  return { nextLat: lat + dLat, nextLon: lon + dLon, dLat, dLon };
};

const handleNavigatingMode = (lat, lon, speedFactor) => {
  if (!navTarget && navQueue.length > 0) navTarget = navQueue.shift();
  if (!navTarget) return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };

  const distLat = navTarget.lat - lat;
  const distLon = navTarget.lon - lon;
  const distance = Math.hypot(distLat, distLon);
  const navSpeed = 0.0002 * speedFactor;

  if (distance <= navSpeed) {
    const finalLat = navTarget.lat;
    const finalLon = navTarget.lon;
    if (navQueue.length > 0) navTarget = navQueue.shift();
    else {
      controlMode = "MANUAL";
      navTarget = null;
    }
    return { nextLat: finalLat, nextLon: finalLon, dLat: 0, dLon: 0 };
  }

  const dLat = (distLat / distance) * navSpeed;
  const dLon = (distLon / distance) * navSpeed;
  return { nextLat: lat + dLat, nextLon: lon + dLon, dLat, dLon };
};

const handleManualMode = (lat, lon, speedFactor) => {
  const dLat = manualVelocity.y * speedFactor;
  const dLon = manualVelocity.x * speedFactor;
  return { nextLat: lat + dLat, nextLon: lon + dLon, dLat, dLon };
};

const calculateNextPosition = (lat, lon, speedFactor) => {
  if (controlMode === "AUTO") return handleAutoMode(lat, lon, speedFactor);
  if (controlMode === "NAVIGATING") return handleNavigatingMode(lat, lon, speedFactor);
  if (controlMode === "MANUAL") return handleManualMode(lat, lon, speedFactor);
  return { nextLat: lat, nextLon: lon, dLat: 0, dLon: 0 };
};

const updateBatteryState = () => {
  if (isCharging) {
    battery += 5;
    speed = 0;
    if (battery >= 100) { 
      battery = 100; 
      isCharging = false; 
    }
  } else {
    battery -= 0.5;
    if (battery <= 10) isCharging = true;
  }
};

const applyGeofencing = (cLat, cLon, nLat, nLon) => {
  if (!safeZonePolygon || safeZonePolygon.length < 3) return { validLat: nLat, validLon: nLon };
  if (nLat === cLat && nLon === cLon) return { validLat: nLat, validLon: nLon };
  if (!isPointInPolygon(nLat, nLon, safeZonePolygon)) return { validLat: cLat, validLon: cLon };
  return { validLat: nLat, validLon: nLon };
};

const updateSpeedAndHeading = (cLat, cLon, nLat, nLon, dLat, dLon) => {
  if (Math.abs(nLat - cLat) > 0 || Math.abs(nLon - cLon) > 0 || Math.abs(dLat) > 0) {
    if (Math.abs(dLat) > 0 || Math.abs(dLon) > 0) {
      const angleRad = Math.atan2(dLon, dLat);
      heading = (angleRad * 180) / Math.PI;
      if (heading < 0) heading += 360;
    }
    speed = (Math.hypot(nLat - cLat, nLon - cLon) * 100000).toFixed(2);
  } else {
    speed = 0;
  }
};

const emitEmergencyStop = (io) => {
  speed = 0;
  if (!io) return;
  io.emit("robot:status", {
    battery: { percentage: Math.floor(battery), status: "IDLE" },
    position: { lat: currentLat, lon: currentLon },
    system: {
      speed: 0, heading: Math.floor(heading),
      status: "EMERGENCY_STOP", mode: "MANUAL",
      emergencyStop: true, speedLimit: speedLimitPercent,
      target: null, queue: []
    }
  });
};

export const setEmergencyStop = (active) => {
  emergencyStop = active;
  console.log(`🚨 E-STOP ${active ? "ACTIVADO" : "DESACTIVADO"}`);
  if (active) {
    speed = 0;
    controlMode = "MANUAL";
    navTarget = null;
    navQueue = [];
  }
};

export const setSpeedLimit = (limit) => { speedLimitPercent = limit; };

export const queueNavPoint = (point) => { navQueue.push(point); };

export const clearNavQueue = () => { navQueue = []; };

export const setSimulationZone = (zone) => {
  safeZonePolygon = zone;
  autoPath = generateCoveragePath(zone);
  currentPathIndex = 0;
};

export const clearSimulationZone = () => {
  safeZonePolygon = null;
  autoPath = [];
  currentPathIndex = 0;
};

export const setRobotMode = (mode) => {
  controlMode = mode;
  if (mode === "AUTO" && (!autoPath || autoPath.length === 0) && safeZonePolygon) {
    autoPath = generateCoveragePath(safeZonePolygon);
    currentPathIndex = 0;
  }
  if (mode === "MANUAL") manualVelocity = { x: 0, y: 0 };
};

export const setManualVelocity = (vx, vy) => {
  if (controlMode === "MANUAL") manualVelocity = { x: vx * 0.00015, y: vy * 0.00015 };
};

export const setNavigationTarget = (lat, lon, clearQueue = false) => {
  navTarget = { lat, lon };
  if (clearQueue) navQueue = [];
  controlMode = "NAVIGATING";
};

export const startRobotSimulation = (io) => {
  console.log("🤖 Simulador: ACTIVADO");

  setInterval(async () => {
    if (emergencyStop) {
      emitEmergencyStop(io);
      return;
    }

    updateBatteryState();

    if (!isCharging) {
      const speedFactor = speedLimitPercent / 100;
      const { nextLat, nextLon, dLat, dLon } = calculateNextPosition(currentLat, currentLon, speedFactor);
      const { validLat, validLon } = applyGeofencing(currentLat, currentLon, nextLat, nextLon);
      
      updateSpeedAndHeading(currentLat, currentLon, validLat, validLon, dLat, dLon);

      currentLat = validLat;
      currentLon = validLon;
    }

    const currentSystemStatus = getSystemStatus(isCharging, speed);

    try {
      await pool.query(
        `UPDATE robot_estado SET current_lat = $1, current_lon = $2, battery_percentage = $3, battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7 WHERE id = 1`,
        [currentLat, currentLon, Math.floor(battery), isCharging ? "CHARGING" : "IDLE", currentSystemStatus, speed, Math.floor(heading)]
      );

      if (io) {
        io.emit("robot:status", {
          battery: { percentage: Math.floor(battery), status: isCharging ? "CHARGING" : "IDLE", voltage: 12.5, temperature: 35, timeRemaining: isCharging ? "Cargando..." : `${Math.floor(battery * 1.5)} min` },
          position: { lat: currentLat, lon: currentLon },
          system: {
            speed: speed, heading: Math.floor(heading),
            status: currentSystemStatus,
            mode: controlMode, emergencyStop: false,
            speedLimit: speedLimitPercent, target: navTarget, queue: navQueue
          }
        });
      }
    } catch (error) { console.error("Error estado:", error.message); }
  }, MOVEMENT_INTERVAL);

  setInterval(async () => {
    if (isCharging || emergencyStop) return;

    const factorLat = Math.sin(currentLat * 15000);
    const factorLon = Math.cos(currentLon * 15000);
    const intensity = (factorLat + factorLon + 2) / 4;

    const humedadBase = 20 + (intensity * 70);
    const phBase = 5 + (intensity * 3);
    const tempBase = 15 + (intensity * 20);

    currentHumidity = Math.max(0, Math.min(100, humedadBase + (Math.random() * 4 - 2)));
    currentPh = Math.max(4, Math.min(10, phBase + (Math.random() * 0.4 - 0.2)));
    currentTemp = tempBase + (Math.random() * 1 - 0.5);

    try {
      const newRecord = await pool.query(
        `INSERT INTO robot_datos (lat, lon, humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [currentLat, currentLon, currentHumidity.toFixed(1), currentTemp.toFixed(1), currentPh.toFixed(1), 50, 30, 40, 500]
      );
      if (io && newRecord.rows[0]) io.emit("robot:new_data", newRecord.rows[0]);
      await pool.query(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, [MAX_HISTORY_RECORDS]);
    } catch (error) { console.error("Error datos:", error.message); }
  }, SENSOR_INTERVAL);
};