// server/simulator.js
import { pool } from "./config/db.js";
import * as turf from "@turf/turf";

const MOVEMENT_INTERVAL = 1000;
const SENSOR_INTERVAL = 5000;   
const MAX_HISTORY_RECORDS = 50; 

let currentLat = 42.3525;
let currentLon = -3.6845;
let battery = 100;
let isCharging = false;
let heading = 0;
let speed = 0;

let currentTemp = 20;
let currentHumidity = 50;
let currentPh = 7.0;

// --- VARIABLES DE CONTROL ---
let controlMode = "MANUAL"; 
let manualVelocity = { x: 0, y: 0 }; 
let navTarget = null; 

let safeZonePolygon = null;
let autoPath = [];       
let currentPathIndex = 0;

// Función de validación (Filtro de seguridad estricto)
const isPointInPolygon = (lat, lon, vs) => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > lon) !== (yj > lon))
            && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// --- ALGORITMO DE COBERTURA CON ROTACIÓN Y CABECERA ---
const generateCoveragePath = (zone) => {
    try {
        if (!zone || zone.length < 3) return [];

        const finalPath = [];

        // 1. AÑADIR CABECERA (Perímetro inicial)
        zone.forEach(p => finalPath.push({ lat: p[0], lon: p[1] }));
        finalPath.push({ lat: zone[0][0], lon: zone[0][1] }); 

        // 2. PREPARAR POLÍGONO PARA TURF
        const turfCoords = zone.map(p => [p[1], p[0]]); 
        if (turfCoords[0][0] !== turfCoords[turfCoords.length-1][0]) {
            turfCoords.push(turfCoords[0]);
        }
        const poly = turf.polygon([turfCoords]);

        // 3. CALCULAR ÁNGULO DE ROTACIÓN ÓPTIMO (Lado más largo)
        let maxDist = 0;
        let bestAngle = 0;
        for (let i = 0; i < zone.length; i++) {
            const p1 = zone[i];
            const p2 = zone[(i + 1) % zone.length];
            const dist = Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);
            if (dist > maxDist) {
                maxDist = dist;
                bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
            }
        }

        // 4. ROTAR, GENERAR GRID Y DES-ROTAR
        const rotatedPoly = turf.transformRotate(poly, -bestAngle);
        const bbox = turf.bbox(rotatedPoly);
        
        // Grid de 8 metros (0.008km)
        const pointGrid = turf.pointGrid(bbox, 0.008, { units: 'kilometers', mask: rotatedPoly });

        let internalPoints = pointGrid.features.map(f => {
            const rotatedPt = turf.transformRotate(f, bestAngle);
            return {
                lat: rotatedPt.geometry.coordinates[1],
                lon: rotatedPt.geometry.coordinates[0]
            };
        });

        // 5. VALIDACIÓN Y ZIG-ZAG
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

        console.log(`🚜 Ruta optimizada: ${finalPath.length} puntos (Ángulo: ${bestAngle.toFixed(2)}°)`);
        return finalPath;

    } catch (error) {
        console.error("Error en algoritmo de cobertura:", error);
        return [];
    }
};

export const setSimulationZone = (zone) => {
  safeZonePolygon = zone;
  autoPath = generateCoveragePath(zone);
  currentPathIndex = 0;
  console.log("🛡️ Simulador: Zona actualizada y ruta calculada");
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
  
  console.log(`🎮 Simulador: Modo cambiado a ${mode}`);
  if (mode === "MANUAL") manualVelocity = { x: 0, y: 0 };
  if (mode !== "NAVIGATING") navTarget = null;
};

export const setManualVelocity = (vx, vy) => {
  if (controlMode === "MANUAL") {
    manualVelocity = { x: vx * 0.00015, y: vy * 0.00015 };
  }
};

export const setNavigationTarget = (lat, lon) => {
    navTarget = { lat, lon };
    controlMode = "NAVIGATING";
    console.log(`📍 Navegando a: ${lat}, ${lon}`);
};

export const startRobotSimulation = (io) => {
  console.log("🤖 Simulador: ACTIVADO");

  setInterval(async () => {
    if (isCharging) {
      battery += 5;
      speed = 0;
      if (battery >= 100) { battery = 100; isCharging = false; }
    } else {
      battery -= (controlMode === "MANUAL" ? 0.5 : 0.8);
      if (battery <= 10) isCharging = true;
    }

    if (!isCharging) {
      let nextLat = currentLat;
      let nextLon = currentLon;
      let dLat = 0;
      let dLon = 0;

      if (controlMode === "AUTO") {
        if (autoPath.length > 0 && currentPathIndex < autoPath.length) {
            const target = autoPath[currentPathIndex];
            const distLat = target.lat - currentLat;
            const distLon = target.lon - currentLon;
            const distance = Math.sqrt(distLat**2 + distLon**2);
            const workSpeed = 0.00010; 

            if (distance < 0.00008) {
                currentPathIndex++;
                if (currentPathIndex >= autoPath.length) {
                    console.log("✅ Trabajo completado.");
                    controlMode = "MANUAL"; 
                }
            } else {
                dLat = (distLat / distance) * workSpeed;
                dLon = (distLon / distance) * workSpeed;
            }
        } else {
            dLat = 0; dLon = 0;
        }
      
      } else if (controlMode === "MANUAL") {
        dLat = manualVelocity.y;
        dLon = manualVelocity.x;

      } else if (controlMode === "NAVIGATING" && navTarget) {
        const distLat = navTarget.lat - currentLat;
        const distLon = navTarget.lon - currentLon;
        const distance = Math.sqrt(distLat**2 + distLon**2);

        if (distance < 0.00005) {
            console.log("🏁 Destino alcanzado");
            controlMode = "MANUAL"; 
            navTarget = null;
            speed = 0;
        } else {
            const navSpeed = 0.00020; 
            dLat = (distLat / distance) * navSpeed;
            dLon = (distLon / distance) * navSpeed;
        }
      }

      nextLat = currentLat + dLat;
      nextLon = currentLon + dLon;

      if (safeZonePolygon && safeZonePolygon.length >= 3) {
        if (!isPointInPolygon(nextLat, nextLon, safeZonePolygon)) {
             nextLat = currentLat;
             nextLon = currentLon;
        }
      }

      currentLat = nextLat;
      currentLon = nextLon;

      if (Math.abs(dLat) > 0 || Math.abs(dLon) > 0) {
        const angleRad = Math.atan2(dLon, dLat); 
        heading = (angleRad * 180) / Math.PI;
        if (heading < 0) heading += 360;
        speed = (Math.sqrt(dLat**2 + dLon**2) * 100000).toFixed(2);
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
          system: { speed: speed, heading: Math.floor(heading), status: isCharging ? "CHARGING" : (speed > 0 ? "WORKING" : "IDLE"), mode: controlMode, target: navTarget }
        });
      }
    } catch (error) { console.error("Error simulador estado:", error.message); }
  }, MOVEMENT_INTERVAL);

  setInterval(async () => {
    if (isCharging) return; 
    currentTemp += (Math.random() - 0.5) * 2;
    currentHumidity = Math.max(0, Math.min(100, currentHumidity + (Math.random() - 0.5) * 5));
    currentPh = Math.max(4, Math.min(10, currentPh + (Math.random() - 0.5) * 0.2));
    
    try {
      const newRecord = await pool.query(
        `INSERT INTO robot_datos (lat, lon, humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [currentLat, currentLon, currentHumidity.toFixed(1), currentTemp.toFixed(1), currentPh.toFixed(1), 50, 30, 40, 500]
      );
      if (io && newRecord.rows[0]) io.emit("robot:new_data", newRecord.rows[0]);
      await pool.query(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, [MAX_HISTORY_RECORDS]);
    } catch (error) { console.error("Error simulador datos:", error.message); }
  }, SENSOR_INTERVAL);
};