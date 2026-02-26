// server/simulator.js
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
let currentPh = 7.0;

// Estado del Sistema
let controlMode = "MANUAL"; 
let manualVelocity = { x: 0, y: 0 }; 

// Navegación
let navTarget = null; 
let navQueue = []; 

// Seguridad
let emergencyStop = false;
let speedLimitPercent = 50; 

// Geofencing
let safeZonePolygon = null;
let autoPath = [];       
let currentPathIndex = 0;

// --- FUNCIONES AUXILIARES ---
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

        // 1. Cabecera (Perímetro)
        zone.forEach(p => finalPath.push({ lat: p[0], lon: p[1] }));
        finalPath.push({ lat: zone[0][0], lon: zone[0][1] }); 

        // 2. Preparar Turf
        const turfCoords = zone.map(p => [p[1], p[0]]); 
        if (turfCoords[0][0] !== turfCoords[turfCoords.length-1][0]) turfCoords.push(turfCoords[0]);
        const poly = turf.polygon([turfCoords]);

        // 3. Ángulo óptimo
        let maxDist = 0, bestAngle = 0;
        for (let i = 0; i < zone.length; i++) {
            const p1 = zone[i], p2 = zone[(i + 1) % zone.length];
            const dist = Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);
            if (dist > maxDist) {
                maxDist = dist;
                bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
            }
        }

        // 4. Rotar y Grid
        const rotatedPoly = turf.transformRotate(poly, -bestAngle);
        const bbox = turf.bbox(rotatedPoly);
        const pointGrid = turf.pointGrid(bbox, 0.008, { units: 'kilometers', mask: rotatedPoly });

        let internalPoints = pointGrid.features.map(f => {
            const rotatedPt = turf.transformRotate(f, bestAngle);
            return { lat: rotatedPt.geometry.coordinates[1], lon: rotatedPt.geometry.coordinates[0] };
        });

        // 5. Validar y ordenar en Zig-Zag
        const validatedPoints = internalPoints.filter(p => isPointInPolygon(p.lat, p.lon, zone));
        const rows = {};
        validatedPoints.forEach(p => {
            const key = p.lat.toFixed(5);
            if (!rows[key]) rows[key] = [];
            rows[key].push(p);
        });

        const sortedKeys = Object.keys(rows).sort().reverse();
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

// --- SETTERS EXPORTADOS (Usados por index.js) ---
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

// --- BUCLE PRINCIPAL ---
export const startRobotSimulation = (io) => {
  console.log("🤖 Simulador: ACTIVADO");

  setInterval(async () => {
    // 1. CHEQUEO CRÍTICO DE SEGURIDAD
    if (emergencyStop) {
        speed = 0;
        if (io) {
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
        }
        return; // Detiene la simulación de movimiento aquí
    }

    // 2. Batería
    if (isCharging) {
      battery += 5;
      speed = 0;
      if (battery >= 100) { battery = 100; isCharging = false; }
    } else {
      battery -= 0.5;
      if (battery <= 10) isCharging = true;
    }

    // 3. Lógica de Movimiento
    if (!isCharging) {
      let nextLat = currentLat;
      let nextLon = currentLon;
      let dLat = 0;
      let dLon = 0;

      // FACTOR DE VELOCIDAD (Slider)
      const speedFactor = speedLimitPercent / 100;

      if (controlMode === "AUTO") {
        if (autoPath.length > 0 && currentPathIndex < autoPath.length) {
            const target = autoPath[currentPathIndex];
            const distLat = target.lat - currentLat;
            const distLon = target.lon - currentLon;
            const distance = Math.sqrt(distLat**2 + distLon**2);
            const workSpeed = 0.00010 * speedFactor; 

            if (distance <= workSpeed) {
                nextLat = target.lat; nextLon = target.lon;
                currentPathIndex++;
                if (currentPathIndex >= autoPath.length) controlMode = "MANUAL"; 
            } else {
                dLat = (distLat / distance) * workSpeed;
                dLon = (distLon / distance) * workSpeed;
                nextLat = currentLat + dLat; nextLon = currentLon + dLon;
            }
        }
      } 
      else if (controlMode === "NAVIGATING") {
          if (!navTarget && navQueue.length > 0) navTarget = navQueue.shift();

          if (navTarget) {
            const distLat = navTarget.lat - currentLat;
            const distLon = navTarget.lon - currentLon;
            const distance = Math.sqrt(distLat**2 + distLon**2);
            const navSpeed = 0.00020 * speedFactor;

            if (distance <= navSpeed) {
                nextLat = navTarget.lat; nextLon = navTarget.lon;
                if (navQueue.length > 0) navTarget = navQueue.shift();
                else { controlMode = "MANUAL"; navTarget = null; }
            } else {
                dLat = (distLat / distance) * navSpeed;
                dLon = (distLon / distance) * navSpeed;
                nextLat = currentLat + dLat; nextLon = currentLon + dLon;
            }
          }
      } 
      else if (controlMode === "MANUAL") {
          dLat = manualVelocity.y * speedFactor;
          dLon = manualVelocity.x * speedFactor;
          nextLat = currentLat + dLat; nextLon = currentLon + dLon;
      }

      // Geofencing
      if (safeZonePolygon && safeZonePolygon.length >= 3) {
          if (nextLat !== currentLat || nextLon !== currentLon) {
              if (!isPointInPolygon(nextLat, nextLon, safeZonePolygon)) {
                   nextLat = currentLat; nextLon = currentLon;
              }
          }
      }

      currentLat = nextLat; currentLon = nextLon;

      if (Math.abs(nextLat - currentLat) > 0 || Math.abs(nextLon - currentLon) > 0 || Math.abs(dLat) > 0) {
        if (Math.abs(dLat) > 0 || Math.abs(dLon) > 0) {
             const angleRad = Math.atan2(dLon, dLat); 
             heading = (angleRad * 180) / Math.PI;
             if (heading < 0) heading += 360;
        }
        speed = (Math.sqrt((nextLat - currentLat)**2 + (nextLon - currentLon)**2) * 100000).toFixed(2);
      } else {
        speed = 0;
      }
    }

    try {
      await pool.query(
        `UPDATE robot_estado SET current_lat = $1, current_lon = $2, battery_percentage = $3, battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7 WHERE id = 1`,
        [currentLat, currentLon, Math.floor(battery), isCharging ? "CHARGING" : "IDLE", isCharging ? "CHARGING" : (speed > 0 ? "WORKING" : "IDLE"), speed, Math.floor(heading)]
      );

      if (io) {
        io.emit("robot:status", {
          battery: { percentage: Math.floor(battery), status: isCharging ? "CHARGING" : "IDLE", voltage: 12.5, temperature: 35, timeRemaining: isCharging ? "Cargando..." : `${Math.floor(battery * 1.5)} min` },
          position: { lat: currentLat, lon: currentLon },
          system: {
            speed: speed, heading: Math.floor(heading),
            status: isCharging ? "CHARGING" : (speed > 0 ? "WORKING" : "IDLE"),
            mode: controlMode, emergencyStop: false,
            speedLimit: speedLimitPercent, target: navTarget, queue: navQueue
          }
        });
      }
    } catch (error) { console.error("Error estado:", error.message); }
  }, MOVEMENT_INTERVAL);

  // 4. Sensores
  setInterval(async () => {
    if (isCharging || emergencyStop) return; 

    // --- MEJORA: Lógica de manchas térmicas basada en la posición GPS (sin tocar BD) ---
    const factorLat = Math.sin(currentLat * 15000); 
    const factorLon = Math.cos(currentLon * 15000);
    const intensity = (factorLat + factorLon + 2) / 4; 

    const humedadBase = 20 + (intensity * 70); 
    const phBase = 5.0 + (intensity * 3.0);    
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