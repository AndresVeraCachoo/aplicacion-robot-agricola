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

// Variables ambientales simuladas
let currentTemp = 20;
let currentHumidity = 50;
let currentPh = 7.0;

let latVelocity = 0.00015; 
let lonVelocity = 0.00010; 

// Recibimos 'io' como argumento
export const startRobotSimulation = (io) => {
  console.log("🤖 Simulador: ACTIVADO con soporte WebSocket");

  // 1. BUCLE DE MOVIMIENTO (Emite estado rápido)
  setInterval(async () => {
    
    // Lógica de Batería
    if (isCharging) {
      battery += 5;
      speed = 0;
      if (battery >= 100) { battery = 100; isCharging = false; }
    } else {
      battery -= 0.5;
      if (battery <= 10) { isCharging = true; }
    }

    // Lógica de Movimiento
    if (!isCharging) {
      if (Math.random() > 0.9) latVelocity *= -1;
      if (Math.random() > 0.9) lonVelocity *= -1;
      
      currentLat += latVelocity + (Math.random() - 0.5) * 0.00005;
      currentLon += lonVelocity + (Math.random() - 0.5) * 0.00005;

      const angleRad = Math.atan2(lonVelocity, latVelocity);
      heading = (angleRad * 180) / Math.PI;
      speed = (Math.sqrt(latVelocity**2 + lonVelocity**2) * 100000).toFixed(2);
    }

    // Actualizar DB
    try {
      await pool.query(
        `UPDATE robot_estado
         SET current_lat = $1, current_lon = $2, battery_percentage = $3,
             battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7
         WHERE id = 1`,
        [
          currentLat, currentLon, Math.floor(battery),
          isCharging ? "CHARGING" : "IDLE",
          isCharging ? "CHARGING" : "WORKING",
          speed, Math.floor(heading)
        ]
      );

      // --- EMITIR EVENTO WS (TELEMETRÍA) ---
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
            status: isCharging ? "CHARGING" : "WORKING"
          }
        });
      }

    } catch (error) {
      console.error("Error simulador estado:", error.message);
    }
  }, MOVEMENT_INTERVAL);

  // 2. BUCLE DE SENSORES (Emite nuevos datos de muestreo)
  setInterval(async () => {
    if (isCharging) return; 

    // Variación aleatoria suave
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

      // --- EMITIR EVENTO WS (NUEVA MUESTRA) ---
      if (io && newRecord.rows[0]) {
        io.emit("robot:new_data", newRecord.rows[0]);
      }

      // Limpieza
      await pool.query(`
        DELETE FROM robot_datos WHERE id NOT IN (
          SELECT id FROM robot_datos ORDER BY timestamp DESC LIMIT $1
        )`, [MAX_HISTORY_RECORDS]);

    } catch (error) {
      console.error("Error simulador datos:", error.message);
    }
  }, SENSOR_INTERVAL);
};