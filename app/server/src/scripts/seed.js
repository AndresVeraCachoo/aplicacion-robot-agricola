// server/scripts/seed.js
import bcrypt from "bcrypt";
import crypto from "node:crypto"; 
import { pool } from "../config/db.js";
import { generateCoveragePath, calculateSolarRadiation } from "../simulator.js"; 

// --- UTILIDADES ---
const getSecureRandom = () => {
  return crypto.randomBytes(4).readUInt32LE(0) / (0xffffffff + 1);
};

// --- MÓDULOS DE INYECCIÓN ---

async function seedUsers() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const operadorHash = await bcrypt.hash("operador123", 10);
  const usuarioHash = await bcrypt.hash("usuario123", 10);

  await pool.query(`
    INSERT INTO usuarios (name, password, role) VALUES 
    ('admin', $1, 'admin'),
    ('operador', $2, 'operador'),
    ('usuario', $3, 'usuario')
  `, [adminHash, operadorHash, usuarioHash]);
}

async function seedRobotState() {
  await pool.query(`
    INSERT INTO robot_estado (battery_percentage, battery_status, battery_voltage, battery_temperature, battery_time_remaining, system_status, system_speed, system_heading, current_lat, current_lon)
    VALUES (85, 'IDLE', 24.10, 32.00, '5h 10m', 'IDLE', 0.00, 90, 42.36317, -3.69882)
  `);
}

async function seedMissionsAndData(now) {
  // Ajustado: Misiones desplazadas a 4, 3, 2 y 1 días en el pasado.
  const misionesDef = [
    { nombre: 'Misión Norte', tipo: 'Humedad, Temperatura, pH, N-P-K, Rad', diasAtras: 4, coords: [[42.3647, -3.699], [42.3647, -3.698], [42.3652, -3.6985], [42.3647, -3.699]] },
    { nombre: 'Misión Sur', tipo: 'Humedad, Temperatura, pH, N-P-K, Rad', diasAtras: 3, coords: [[42.3612, -3.699], [42.3612, -3.698], [42.3617, -3.698], [42.3617, -3.699], [42.3612, -3.699]] },
    { nombre: 'Misión Este', tipo: 'Humedad, Temperatura, pH, N-P-K, Rad', diasAtras: 2, coords: [[42.3627, -3.6962], [42.3627, -3.6957], [42.3631, -3.6955], [42.3634, -3.696], [42.3631, -3.6965], [42.3627, -3.6962]] },
    { nombre: 'Misión Oeste', tipo: 'Humedad, Temperatura, pH, N-P-K, Rad', diasAtras: 1, coords: [[42.3627, -3.702], [42.3625, -3.7015], [42.3629, -3.701], [42.3634, -3.701], [42.3636, -3.7015], [42.3632, -3.702], [42.3627, -3.702]] }
  ];

  let valoresInsert = [];

  for (const mision of misionesDef) {
    // Se establece estrictamente el día hacia atrás y la hora base a las 10:30 AM
    let fechaInicio = new Date(now.getTime() - (mision.diasAtras * 24 * 60 * 60 * 1000));
    fechaInicio.setHours(10, 30, 0, 0);

    const coordsParaGeoJSON = mision.coords.map(c => [c[1], c[0]]);
    const areaGeoJSON = JSON.stringify({ type: "Polygon", coordinates: [coordsParaGeoJSON] });

    const rutaPuntos = generateCoveragePath(mision.coords);
    
    const duracionMilisegundos = rutaPuntos.length * 300000; 
    const fechaFin = new Date(fechaInicio.getTime() + duracionMilisegundos);
    const bateriaGastada = Math.min(100, Math.ceil(rutaPuntos.length * 2));

    const missionRes = await pool.query(`
      INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, fecha_creacion, fecha_programada)
      VALUES ($1, $2, 2.00, 0.00, 20, $3, $4, $4) RETURNING id
    `, [mision.nombre, mision.tipo, areaGeoJSON, fechaInicio.toISOString()]);
    const misionId = missionRes.rows[0].id;

    const ejecucionRes = await pool.query(`
      INSERT INTO ejecuciones_mision (mision_id, estado, fecha_inicio, fecha_fin, bateria_usada)
      VALUES ($1, 'completado', $2, $3, $4) RETURNING id
    `, [misionId, fechaInicio.toISOString(), fechaFin.toISOString(), bateriaGastada]);
    const ejecucionId = ejecucionRes.rows[0].id;

    rutaPuntos.forEach((pt, index) => {
      let lat = pt.lat;
      let lon = pt.lon;
      let humedad = (50 + getSecureRandom() * 20).toFixed(2);
      let temp = (20 + getSecureRandom() * 10).toFixed(2);
      let ph = (6 + getSecureRandom() * 1.5).toFixed(1);
      let nitrogeno = (40 + getSecureRandom() * 20).toFixed(2);
      let fosforo = (20 + getSecureRandom() * 15).toFixed(2);
      let potasio = (100 + getSecureRandom() * 50).toFixed(2);
      
      let puntoDateObj = new Date(fechaInicio.getTime() + index * 300000);
      let radiacion = calculateSolarRadiation(puntoDateObj).toFixed(2);

      valoresInsert.push(`(${lat}, ${lon}, '${puntoDateObj.toISOString()}', ${humedad}, ${temp}, ${ph}, ${nitrogeno}, ${fosforo}, ${potasio}, ${radiacion}, ${ejecucionId})`);
    });
  }

  if (valoresInsert.length > 0) {
    const insertQuery = `
      INSERT INTO robot_datos (lat, lon, "timestamp", humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar, ejecucion_id) 
      VALUES ${valoresInsert.join(', ')}
    `;
    await pool.query(insertQuery);
  }
}

async function seedEnergyHistory(now) {
  console.log("🌱 [Seed] Generando historial de energía con simulación solar y consumo (5 Días)...");
  let energiaInsert = [];
  
  let simBattery = 40; 
  // Ampliado a 5 días completos (5 * 24 * 12 = 1440 ticks de 5 min) para englobar todas las misiones
  const historyPoints = 1440; 
  
  const ejecuciones = await pool.query("SELECT fecha_inicio, fecha_fin FROM ejecuciones_mision");
  const ejecs = ejecuciones.rows;

  for (let i = historyPoints; i >= 0; i--) {
    let tickTime = new Date(now.getTime() - (i * 5 * 60000));
    let estado = 'IDLE';
    let consumo = 0.05; 

    for (let e of ejecs) {
      if (tickTime >= new Date(e.fecha_inicio) && tickTime <= new Date(e.fecha_fin)) {
        estado = 'WORKING';
        consumo = 2; 
        break;
      }
    }

    let radiacion = calculateSolarRadiation(tickTime);
    let generado = radiacion * 0.0015; 
    
    simBattery = simBattery - consumo + generado;
    simBattery = Math.max(0, Math.min(100, simBattery)); 

    energiaInsert.push(`('${tickTime.toISOString()}', ${simBattery.toFixed(2)}, '${estado}', ${radiacion.toFixed(2)}, ${consumo.toFixed(2)}, ${generado.toFixed(2)})`);
  }

  await pool.query(`
    INSERT INTO historial_energia ("timestamp", bateria_porcentaje, estado, radiacion_solar, energia_consumida, energia_generada)
    VALUES ${energiaInsert.join(', ')}
  `);
}

// --- FUNCIÓN PRINCIPAL ---

export async function runSeed(maxRetries = 5, delayMs = 3000) {
  let retries = maxRetries;
  
  while (retries > 0) {
    try {
      const result = await pool.query("SELECT COUNT(*) FROM usuarios");
      const userCount = Number.parseInt(result.rows[0].count, 10);

      if (userCount > 0) {
        console.log("🌱 [Seed] Datos detectados en BD. Ignorando semilla...");
        return; 
      }

      console.log("🌱 [Seed] BD vacía detectada. Iniciando simulación de misiones 100% orgánicas...");
      const now = new Date();

      await seedUsers();
      await seedRobotState();
      await seedMissionsAndData(now);
      await seedEnergyHistory(now);

      console.log("✅ [Seed] BD sembrada con éxito con física de baterías y panel solar.");
      return; 

    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P03' || err.message.includes('termin')) {
        retries--;
        if (retries === 0) {
          console.error("❌ [Seed] Error crítico de conexión tras múltiples intentos:", err.message);
          throw err;
        }
        await new Promise(res => setTimeout(res, delayMs)); 
      } else {
        console.error("❌ [Seed] Error interno al inyectar datos:", err.message);
        throw err; 
      }
    }
  }
}