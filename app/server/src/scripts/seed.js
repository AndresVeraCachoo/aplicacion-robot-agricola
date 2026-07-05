import bcrypt from "bcrypt";
import crypto from "node:crypto"; 
import pg from "pg";
import { generateCoveragePath } from "../simulator/utils.js";
import { calculateSolarRadiation } from "../simulator/systems/energy.js";
import { env } from "../config/env.js";

// En este archivo se utiliza una conexión directa con pg (SQL crudo) en lugar del ORM Prisma
// por motivos de rendimiento durante la fase de siembra (Seed) de la base de datos.
// Esto permite ejecutar inserciones en bloque saltándose las validaciones a nivel
// de aplicación y evitando saturar la RAM de Node.js al crear miles de registros de golpe.
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL
});

/**
 * Genera un número pseudoaleatorio criptográficamente seguro entre 0 y 1.
 * Se utiliza en lugar de Math.random() para evitar patrones predecibles en la simulación de sensores agronómicos.
 * @returns {number} Valor decimal aleatorio.
 */
const getSecureRandom = () => {
  return crypto.randomBytes(4).readUInt32LE(0) / (0xffffffff + 1);
};

/**
 * Inyecta los usuarios del sistema por defecto con contraseñas encriptadas.
 * @returns {Promise<void>}
 */
async function seedUsers() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const operatorHash = await bcrypt.hash("operador123", 10);
  const userHash = await bcrypt.hash("usuario123", 10);

  await pool.query(`
    INSERT INTO usuarios (name, password, role, email) VALUES 
    ('admin', $1, 'admin', 'admin.agroskopos@gmail.com'),
    ('operador', $2, 'operador', NULL),
    ('usuario', $3, 'usuario', NULL)
  `, [adminHash, operatorHash, userHash]);
}

/**
 * Inicializa la tabla de telemetría con un estado de robot inactivo y 85% de batería.
 * @returns {Promise<void>}
 */
async function seedRobotState() {
  await pool.query(`
    INSERT INTO robot_estado (id, battery_percentage, battery_status, battery_voltage, battery_temperature, battery_time_remaining, system_status, system_speed, system_heading, current_lat, current_lon)
    VALUES (1, 85, 'IDLE', 24.10, 32.00, '5h 10m', 'IDLE', 0.00, 90, 42.36317, -3.69882)
  `);
}

/**
 * Genera un historial de misiones y puebla masivamente datos agronómicos sintéticos.
 * Desplaza las fechas hacia atrás en el tiempo para simular un uso real durante varios días.
 * @param {Date} now - Fecha y hora actuales que sirven de pivote de referencia.
 * @returns {Promise<void>}
 */
async function seedMissionsAndData(now) {
  const missionsDef = [
    { name: 'Misión Norte', type: 'Humedad - Temp. Suelo - pH - N-P-K - Rad. Solar', daysAgo: 4, coords: [[42.3647, -3.699], [42.3647, -3.698], [42.3652, -3.6985], [42.3647, -3.699]] },
    { name: 'Misión Sur', type: 'Humedad - Temp. Suelo - pH - N-P-K - Rad. Solar', daysAgo: 3, coords: [[42.3612, -3.699], [42.3612, -3.698], [42.3617, -3.698], [42.3617, -3.699], [42.3612, -3.699]] },
    { name: 'Misión Este', type: 'Humedad - Temp. Suelo - pH - N-P-K - Rad. Solar', daysAgo: 2, coords: [[42.3627, -3.6962], [42.3627, -3.6957], [42.3631, -3.6955], [42.3634, -3.696], [42.3631, -3.6965], [42.3627, -3.6962]] },
    { name: 'Misión Oeste', type: 'Humedad - Temp. Suelo - pH - N-P-K - Rad. Solar', daysAgo: 1, coords: [[42.3627, -3.702], [42.3625, -3.7015], [42.3629, -3.701], [42.3634, -3.701], [42.3636, -3.7015], [42.3632, -3.702], [42.3627, -3.702]] }
  ];

  let insertValues = [];
  let energyInsertValues = [];
  let simBattery = 85;

  for (const mission of missionsDef) {
    let startDate = new Date(now.getTime() - (mission.daysAgo * 24 * 60 * 60 * 1000));
    startDate.setHours(10, 30, 0, 0);

    // Conversión estructural requerida por PostGIS para leer las coordenadas correctamente
    const geoJsonCoords = mission.coords.map(c => [c[1], c[0]]);
    const areaGeoJSON = JSON.stringify({ type: "Polygon", coordinates: [geoJsonCoords] });

    const pathPoints = generateCoveragePath(mission.coords);
    
    // Asumiendo un lapso de tiempo de 5 minutos (300,000 ms) entre lecturas de sensores
    const durationMs = pathPoints.length * 300000; 
    const endDate = new Date(startDate.getTime() + durationMs);
    const batteryUsed = Math.min(100, Math.ceil(pathPoints.length * 2));

    const missionRes = await pool.query(`
      INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, fecha_creacion, fecha_programada)
      VALUES ($1, $2, 2.00, 0.00, 20, $3, $4, $4) RETURNING id
    `, [mission.name, mission.type, areaGeoJSON, startDate.toISOString()]);
    const missionId = missionRes.rows[0].id;

    const executionRes = await pool.query(`
      INSERT INTO ejecuciones_mision (mision_id, estado, fecha_inicio, fecha_fin, bateria_usada)
      VALUES ($1, 'completed', $2, $3, $4) RETURNING id
    `, [missionId, startDate.toISOString(), endDate.toISOString(), batteryUsed]);
    const executionId = executionRes.rows[0].id;

    pathPoints.forEach((pt, index) => {
      let lat = pt.lat;
      let lon = pt.lon;
      let humidity = (50 + getSecureRandom() * 20).toFixed(2);
      let temp = (20 + getSecureRandom() * 10).toFixed(2);
      let ph = (6 + getSecureRandom() * 1.5).toFixed(1);
      let nitrogen = (40 + getSecureRandom() * 20).toFixed(2);
      let phosphorus = (20 + getSecureRandom() * 15).toFixed(2);
      let potassium = (100 + getSecureRandom() * 50).toFixed(2);
      
      let pointDateObj = new Date(startDate.getTime() + index * 300000);
      let radiation = calculateSolarRadiation(pointDateObj).toFixed(2);

      // Agrupa filas crudas para realizar una inserción masiva y no saturar el pool de conexiones
      insertValues.push(`(${lat}, ${lon}, '${pointDateObj.toISOString()}', ${humidity}, ${temp}, ${ph}, ${nitrogen}, ${phosphorus}, ${potassium}, ${radiation}, ${executionId})`);

      // Generar y asociar dato de energía para ese mismo punto de la misión
      let generated = radiation * 0.0015;
      simBattery = Math.max(0, Math.min(100, simBattery - 2 + generated));
      energyInsertValues.push(`('${pointDateObj.toISOString()}', ${simBattery.toFixed(2)}, 'WORKING', ${radiation}, 2.00, ${generated.toFixed(2)}, ${temp})`);
    });
  }

  if (insertValues.length > 0) {
    const insertQuery = `
      INSERT INTO robot_datos (lat, lon, "timestamp", humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar, ejecucion_id) 
      VALUES ${insertValues.join(', ')}
    `;
    await pool.query(insertQuery);
  }

  if (energyInsertValues.length > 0) {
    const insertEnergyQuery = `
      INSERT INTO historial_energia ("timestamp", bateria_porcentaje, estado, radiacion_solar, energia_consumida, energia_generada, temperatura)
      VALUES ${energyInsertValues.join(', ')}
    `;
    await pool.query(insertEnergyQuery);
  }
}

/**
 * Genera el historial de telemetría de energía.
 * Cruza ciclos de día/noche con plazos de ejecución de misiones para simular un consumo real vs carga solar.
 * @param {Date} now - Fecha y hora actuales que sirven de pivote de referencia.
 * @returns {Promise<void>}
 */
async function seedEnergyHistory(now) {
  console.log("[Seed] Generando historial de energía con simulación solar y consumo (5 Días)...");
  let energyInsert = [];
  
  let simBattery = 40; 
  // 1440 ciclos representan 5 días divididos en fracciones de 5 minutos
  const historyPoints = 1440; 
  
  const executions = await pool.query("SELECT fecha_inicio, fecha_fin FROM ejecuciones_mision");
  const execs = executions.rows;

  for (let i = historyPoints; i >= 0; i--) {
    let tickTime = new Date(now.getTime() - (i * 5 * 60000));
    let status = 'IDLE';
    let consumption = 0.05; 

    for (let e of execs) {
      if (tickTime >= new Date(e.fecha_inicio) && tickTime <= new Date(e.fecha_fin)) {
        status = 'WORKING';
        break;
      }
    }

    // Si está en misión, saltamos este tick porque ya se insertaron datos de energía precisos en seedMissionsAndData
    if (status === 'WORKING') continue;

    let radiation = calculateSolarRadiation(tickTime);
    let generated = radiation * 0.0015; 
    
    simBattery = simBattery - consumption + generated;
    simBattery = Math.max(0, Math.min(100, simBattery)); 

    energyInsert.push(`('${tickTime.toISOString()}', ${simBattery.toFixed(2)}, '${status}', ${radiation.toFixed(2)}, ${consumption.toFixed(2)}, ${generated.toFixed(2)})`);
  }

  await pool.query(`
    INSERT INTO historial_energia ("timestamp", bateria_porcentaje, estado, radiacion_solar, energia_consumida, energia_generada)
    VALUES ${energyInsert.join(', ')}
  `);
}

/**
 * Punto de entrada para el script de inicialización de la base de datos (Seed).
 * Implementa idempotencia (solo se ejecuta si la BD está vacía) y un sistema de reintentos para entornos Docker.
 * @param {number} [maxRetries=5] - Número de intentos antes de fallar (útil si Postgres tarda en arrancar).
 * @param {number} [delayMs=3000] - Tiempo de espera entre reintentos en milisegundos.
 * @returns {Promise<void>}
 */
export async function runSeed(maxRetries = 5, delayMs = 3000) {
  let retries = maxRetries;
  
  while (retries > 0) {
    try {
      const result = await pool.query("SELECT COUNT(*) FROM usuarios");
      const userCount = Number.parseInt(result.rows[0].count, 10);

      if (userCount > 0) {
        console.log("[Seed] Datos detectados en BD. Omitiendo seed...");
        return; 
      }

      console.log("[Seed] BD vacía detectada. Iniciando simulación orgánica de misiones...");
      const now = new Date();

      await seedUsers();
      await seedRobotState();
      await seedMissionsAndData(now);
      await seedEnergyHistory(now);

      console.log("[Seed] BD poblada exitosamente con físicas de batería y panel solar.");
      return; 

    } catch (err) {
      // Captura específicamente rechazos de conexión o errores de inicio de base de datos (Docker)
      if (err.code === 'ECONNREFUSED' || err.code === '57P03' || err.message.includes('termin')) {
        retries--;
        if (retries === 0) {
          console.error("[Seed] Error crítico de conexión tras múltiples intentos:", err.message);
          throw err;
        }
        await new Promise(res => setTimeout(res, delayMs)); 
      } else {
        console.error("[Seed] Error interno inyectando datos:", err.message);
        throw err; 
      }
    }
  }
}