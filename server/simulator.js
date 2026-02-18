// server/simulator.js
import { pool } from "./config/db.js";

const MOVEMENT_INTERVAL = 2000; 
const SENSOR_INTERVAL = 5000;   
const MAX_HISTORY_RECORDS = 50; 

let currentLat = 42.3525;
let currentLon = -3.6845;
let battery = 100;
let isCharging = false;
let heading = 0;
let speed = 0;

// Variables ambientales
let currentTemp = 20;
let currentHumidity = 50;
let currentPh = 7.0;

// Variables de movimiento
let latVelocity = 0.00015; 
let lonVelocity = 0.00010; 

// Variables de Control (Inicializado en MANUAL)
let controlMode = "MANUAL"; 
let manualVelocity = { x: 0, y: 0 }; 
let navTarget = null; 

let safeZonePolygon = null;

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

export const setSimulationZone = (zone) => {
  safeZonePolygon = zone;
  console.log("🛡️ Simulador: Polígono de finca actualizado");
};

export const clearSimulationZone = () => {
  safeZonePolygon = null;
};

export const setRobotMode = (mode) => {
  controlMode = mode;
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

  // --- BUCLE DE MOVIMIENTO Y ESTADO ---
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
        if (!safeZonePolygon) {
            dLat = 0;
            dLon = 0;
        } else {
            if (Math.random() > 0.9) latVelocity *= -1;
            if (Math.random() > 0.9) lonVelocity *= -1;
            dLat = latVelocity + (Math.random() - 0.5) * 0.00005;
            dLon = lonVelocity + (Math.random() - 0.5) * 0.00005;
        }
      
      } else if (controlMode === "MANUAL") {
        dLat = manualVelocity.y;
        dLon = manualVelocity.x;

      } else if (controlMode === "NAVIGATING" && navTarget) {
        const distLat = navTarget.lat - currentLat;
        const distLon = navTarget.lon - currentLon;
        const distance = Math.sqrt(distLat**2 + distLon**2);

        if (distance < 0.00002) {
            console.log("🏁 Destino alcanzado");
            controlMode = "AUTO"; 
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
        const inside = isPointInPolygon(nextLat, nextLon, safeZonePolygon);
        if (!inside) {
            if (controlMode === "AUTO") {
                latVelocity *= -1;
                lonVelocity *= -1;
            } else if (controlMode === "NAVIGATING") {
                 console.log("⚠️ Destino fuera de zona segura. Deteniendo.");
                 controlMode = "MANUAL"; 
                 dLat = 0; dLon = 0;
            }
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
        `UPDATE robot_estado
         SET current_lat = $1, current_lon = $2, battery_percentage = $3,
             battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7
         WHERE id = 1`,
        [
          currentLat, currentLon, Math.floor(battery),
          isCharging ? "CHARGING" : "IDLE",
          isCharging ? "CHARGING" : (speed > 0 ? "WORKING" : "IDLE"),
          speed, Math.floor(heading)
        ]
      );

      if (io) {
        io.emit("robot:status", {
          battery: {
            percentage: Math.floor(battery),
            status: isCharging ? "CHARGING" : "IDLE",
            voltage: 12.5,
            temperature: 35,
            timeRemaining: isCharging ? "Cargando..." : `${Math.floor(battery * 1.5)} min`,
          },
          position: { lat: currentLat, lon: currentLon },
          system: {
            speed: speed,
            heading: Math.floor(heading),
            status: isCharging ? "CHARGING" : (speed > 0 ? "WORKING" : "IDLE"),
            mode: controlMode,
            target: navTarget 
          }
        });
      }
    } catch (error) {
      console.error("Error simulador estado:", error.message);
    }
  }, MOVEMENT_INTERVAL);

  // --- BUCLE DE SENSORES (RESTAURADO) ---
  setInterval(async () => {
    if (isCharging) return; 
    
    // Aquí se usan las variables que daban error
    currentTemp += (Math.random() - 0.5) * 2;
    currentHumidity = Math.max(0, Math.min(100, currentHumidity + (Math.random() - 0.5) * 5));
    currentPh = Math.max(4, Math.min(10, currentPh + (Math.random() - 0.5) * 0.2));
    
    const n = Math.floor(Math.random() * 50 + 20);
    const p = Math.floor(Math.random() * 30 + 10);
    const k = Math.floor(Math.random() * 40 + 15);
    const rad = Math.floor(Math.random() * 800 + 200);

    try {
      const newRecord = await pool.query(
        `INSERT INTO robot_datos 
        (lat, lon, humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [currentLat, currentLon, currentHumidity.toFixed(1), currentTemp.toFixed(1), currentPh.toFixed(1), n, p, k, rad]
      );
      if (io && newRecord.rows[0]) {
        io.emit("robot:new_data", newRecord.rows[0]);
      }
      await pool.query(`DELETE FROM robot_datos WHERE id NOT IN (SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1)`, [MAX_HISTORY_RECORDS]);
    } catch (error) { console.error("Error simulador datos:", error.message); }
  }, SENSOR_INTERVAL);
};