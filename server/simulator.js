import { pool } from "./config/db.js";

// --- CONFIGURACIÓN ---
const MOVEMENT_INTERVAL = 2000; // 2 segundos (Movimiento + Actualización Estado)
const SENSOR_INTERVAL = 5000;   // 5 segundos (Generación de Datos Históricos)
const MAX_HISTORY_RECORDS = 50; // Mantener la tabla limpia

// Estado inicial (Cerca de Burgos)
let currentLat = 42.3525;
let currentLon = -3.6845;
let battery = 100;
let isCharging = false;
let heading = 0;
let speed = 0;

// Variables de "Estado Ambiental" para variaciones suaves (Random Walk)
let currentTemp = 20;
let currentHumidity = 50;
let currentPh = 7.0;

// Vectores de movimiento (Velocidad y Dirección)
let latVelocity = 0.00015; // Velocidad inicial en latitud
let lonVelocity = 0.00010; // Velocidad inicial en longitud

export const startRobotSimulation = () => {
  console.log("🤖 Simulador de Robot Avanzado: ACTIVADO");

  // 1. BUCLE DE MOVIMIENTO Y ESTADO (Rápido)
  setInterval(async () => {
    
    // --- A. Lógica de Batería ---
    if (isCharging) {
      battery += 5; // Carga rápida
      speed = 0;    // El robot se detiene al cargar
      if (battery >= 100) {
        battery = 100;
        isCharging = false;
        console.log("🔋 Carga completa. Reanudando trabajo.");
      }
    } else {
      battery -= 0.5; // Descarga por uso
      if (battery <= 10) {
        isCharging = true;
        console.log("🪫 Batería baja. Iniciando carga...");
      }
    }

    // --- B. Lógica de Movimiento y Rotación ---
    if (!isCharging) {
      // Cambio de dirección aleatorio suave (Zig-Zag realista)
      if (Math.random() > 0.9) latVelocity *= -1;
      if (Math.random() > 0.9) lonVelocity *= -1;

      // Calcular nueva posición con un poco de "ruido" natural
      const deltaLat = latVelocity + (Math.random() - 0.5) * 0.00005;
      const deltaLon = lonVelocity + (Math.random() - 0.5) * 0.00005;

      currentLat += deltaLat;
      currentLon += deltaLon;

      // --- CÁLCULO DE ROTACIÓN (HEADING) ---
      // Math.atan2(y, x) devuelve el ángulo en radianes del vector (deltaLon, deltaLat)
      // Lo convertimos a grados para que el CSS (transform: rotate) lo entienda.
      const angleRad = Math.atan2(deltaLon, deltaLat);
      heading = (angleRad * 180) / Math.PI; 
      
      // Ajuste opcional: Si tu icono de flecha apunta hacia arriba originalmente, 
      // puede que necesites sumar 90 grados: heading = heading + 90;

      // Calcular velocidad simulada (magnitud del vector)
      speed = (Math.sqrt(deltaLat**2 + deltaLon**2) * 100000).toFixed(2);
    }

    // --- C. Actualizar Estado en Base de Datos ---
    try {
      await pool.query(
        `UPDATE robot_estado
         SET current_lat = $1, current_lon = $2, battery_percentage = $3,
             battery_status = $4, system_status = $5, system_speed = $6, system_heading = $7
         WHERE id = 1`,
        [
          currentLat,
          currentLon,
          Math.floor(battery),
          isCharging ? "CHARGING" : "IDLE",
          isCharging ? "CHARGING" : "WORKING",
          speed,
          Math.floor(heading) // Guardamos el ángulo calculado
        ]
      );
    } catch (error) {
      console.error("Error simulador estado:", error.message);
    }
  }, MOVEMENT_INTERVAL);

  // 2. BUCLE DE SENSORES Y LIMPIEZA (Lento)
  setInterval(async () => {
    if (isCharging) return; // No tomar muestras si carga

    // Variación suave de sensores
    currentTemp += (Math.random() - 0.5) * 2;
    currentHumidity += (Math.random() - 0.5) * 5;
    currentPh += (Math.random() - 0.5) * 0.2;

    // Límites lógicos
    currentHumidity = Math.max(0, Math.min(100, currentHumidity));
    currentTemp = Math.max(-10, Math.min(45, currentTemp));
    currentPh = Math.max(4, Math.min(10, currentPh));

    const n = Math.floor(Math.random() * 50 + 20);
    const p = Math.floor(Math.random() * 30 + 10);
    const k = Math.floor(Math.random() * 40 + 15);
    const rad = Math.floor(Math.random() * 800 + 200);

    try {
      // 1. Insertar nuevo dato histórico (Punto en el mapa)
      await pool.query(
        `INSERT INTO robot_datos 
        (lat, lon, humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [currentLat, currentLon, currentHumidity.toFixed(1), currentTemp.toFixed(1), currentPh.toFixed(1), n, p, k, rad]
      );

      // 2. LIMPIEZA AUTOMÁTICA
      await pool.query(`
        DELETE FROM robot_datos
        WHERE id NOT IN (
          SELECT id FROM robot_datos
          ORDER BY timestamp DESC
          LIMIT $1
        )
      `, [MAX_HISTORY_RECORDS]);
      
      console.log(`🧹 Mantenimiento: Tabla limpia. Registros actuales: ${MAX_HISTORY_RECORDS}`);

    } catch (error) {
      console.error("Error simulador datos:", error.message);
    }
  }, SENSOR_INTERVAL);
};