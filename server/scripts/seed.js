// server/scripts/seed.js
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateCoveragePath } from "../simulator.js"; 

export async function runSeed(maxRetries = 5, delayMs = 3000) {
  let retries = maxRetries;
  
  while (retries > 0) {
    try {
      // 1. Comprobar si ya hay datos
      const result = await pool.query("SELECT COUNT(*) FROM usuarios");
      const userCount = Number.parseInt(result.rows[0].count, 10);

      if (userCount > 0) {
        console.log("🌱 [Seed] Datos detectados en BD. Ignorando semilla...");
        return; 
      }

      console.log("🌱 [Seed] BD vacía detectada. Iniciando simulación de misiones 100% orgánicas...");

      // 2. Crear Usuarios Dinámicamente
      const adminHash = await bcrypt.hash("admin123", 10);
      const operadorHash = await bcrypt.hash("operador123", 10);
      const usuarioHash = await bcrypt.hash("usuario123", 10);

      await pool.query(`
        INSERT INTO usuarios (name, password, role) VALUES 
        ('admin', $1, 'admin'),
        ('operador', $2, 'operador'),
        ('usuario', $3, 'usuario')
      `, [adminHash, operadorHash, usuarioHash]);

      // 3. Crear Estado del Robot (TOTALMENTE PARADO - Batería al 85%)
      await pool.query(`
        INSERT INTO robot_estado (battery_percentage, battery_status, battery_voltage, battery_temperature, battery_time_remaining, system_status, system_speed, system_heading, current_lat, current_lon)
        VALUES (85, 'IDLE', 24.10, 32.00, '5h 10m', 'IDLE', 0.00, 90, 42.36317, -3.69882)
      `);

      // 4. DEFINICIÓN DE LAS 4 MISIONES
      const misionesDef = [
        {
          nombre: 'Misión Norte',
          tipo: 'Triángulo',
          diasAtras: 4,
          hora: 10, minuto: 30,
          coords: [[42.3647, -3.699], [42.3647, -3.698], [42.3652, -3.6985], [42.3647, -3.699]]
        },
        {
          nombre: 'Misión Sur',
          tipo: 'Cuadrado',
          diasAtras: 3,
          hora: 16, minuto: 15,
          coords: [[42.3612, -3.699], [42.3612, -3.698], [42.3617, -3.698], [42.3617, -3.699], [42.3612, -3.699]]
        },
        {
          nombre: 'Misión Este',
          tipo: 'Pentágono Regular',
          diasAtras: 2,
          hora: 9, minuto: 0,
          coords: [[42.3627, -3.6962], [42.3627, -3.6957], [42.3631, -3.6955], [42.3634, -3.696], [42.3631, -3.6965], [42.3627, -3.6962]]
        },
        {
          nombre: 'Misión Oeste',
          tipo: 'Hexágono Irregular',
          diasAtras: 1,
          hora: 12, minuto: 45,
          coords: [[42.3627, -3.702], [42.3625, -3.7015], [42.3629, -3.701], [42.3634, -3.701], [42.3636, -3.7015], [42.3632, -3.702], [42.3627, -3.702]]
        }
      ];

      let valoresInsert = [];
      const now = new Date();

      // 5. PROCESAR CADA MISIÓN (Duración y puntos naturales)
      for (const mision of misionesDef) {
        const fechaInicio = new Date(now.getTime() - (mision.diasAtras * 24 * 60 * 60 * 1000));
        fechaInicio.setHours(mision.hora, mision.minuto, 0, 0);

        const coordsParaGeoJSON = mision.coords.map(c => [c[1], c[0]]);
        const areaGeoJSON = JSON.stringify({
          type: "Polygon",
          coordinates: [coordsParaGeoJSON]
        });

        // 🔥 LA MAGIA: Calculamos la ruta sin límites. Dejamos que haga los puntos que necesite.
        const rutaPuntos = generateCoveragePath(mision.coords);
        
        // La duración y la batería gastada dependen de lo grande que haya sido la misión
        const duracionMilisegundos = rutaPuntos.length * 90000; 
        const fechaFin = new Date(fechaInicio.getTime() + duracionMilisegundos);
        const bateriaGastada = Math.min(100, Math.ceil(rutaPuntos.length * 0.5)); // 0.5% por punto recorrido

        const missionRes = await pool.query(`
          INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, fecha_creacion, fecha_programada)
          VALUES ($1, $2, 2.00, 0.00, 20, $3, $4, $4) RETURNING id
        `, [mision.nombre, `Análisis en forma de ${mision.tipo}`, areaGeoJSON, fechaInicio.toISOString()]);
        const misionId = missionRes.rows[0].id;

        const ejecucionRes = await pool.query(`
          INSERT INTO ejecuciones_mision (mision_id, estado, fecha_inicio, fecha_fin, bateria_usada)
          VALUES ($1, 'completado', $2, $3, $4) RETURNING id
        `, [misionId, fechaInicio.toISOString(), fechaFin.toISOString(), bateriaGastada]);
        const ejecucionId = ejecucionRes.rows[0].id;

        rutaPuntos.forEach((pt, index) => {
          let lat = pt.lat;
          let lon = pt.lon;
          let humedad = (50 + Math.random() * 20).toFixed(2);
          let temp = (20 + Math.random() * 10).toFixed(2);
          let ph = (6 + Math.random() * 1.5).toFixed(1);
          let nitrogeno = (40 + Math.random() * 20).toFixed(2);
          let radiacion = (400 + Math.random() * 200).toFixed(2);
          
          let puntoDate = new Date(fechaInicio.getTime() + index * 90000).toISOString();

          valoresInsert.push(`(${lat}, ${lon}, '${puntoDate}', ${humedad}, ${temp}, ${ph}, ${nitrogeno}, 30.00, 40.00, ${radiacion}, ${ejecucionId})`);
        });
      }

      // 6. DATOS MANUALES (Sin alterar)
      console.log("🌱 [Seed] Generando puntos extra de recorrido manual libre...");
      const startLon = -3.69882;
      const startLat = 42.36317;
      
      for (let i = 0; i < 40; i++) {
        let lon = startLon + (i * 0.0001);
        let lat = startLat - (i * 0.00005) + Math.sin(i * 0.5) * 0.0002; 
        let humedad = (40 + Math.random() * 15).toFixed(2);
        let temp = (22 + Math.random() * 8).toFixed(2);
        let ph = (6.5 + Math.random() * 1).toFixed(1);
        let manualDate = new Date(now.getTime() - (40 - i) * 60000).toISOString();
        
        valoresInsert.push(`(${lat}, ${lon}, '${manualDate}', ${humedad}, ${temp}, ${ph}, 50.00, 30.00, 40.00, 500, NULL)`);
      }

      // 7. INYECTAR 
      console.log(`🌱 [Seed] Inyectando un total de ${valoresInsert.length} registros orgánicos...`);
      const insertQuery = `
        INSERT INTO robot_datos (lat, lon, "timestamp", humedad, temperatura_suelo, ph, nitrogeno, fosforo, potasio, radiacion_solar, ejecucion_id) 
        VALUES ${valoresInsert.join(', ')}
      `;
      await pool.query(insertQuery);

      console.log("✅ [Seed] BD sembrada con éxito. Variedad de puntos lograda.");
      return; 

    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P03' || err.message.includes('termin')) {
        console.log(`⏳ [Seed] Base de datos despertando... Reintentando...`);
        retries--;
        await new Promise(res => setTimeout(res, delayMs)); 
      } else {
        console.error("❌ [Seed] Error de lógica al inyectar datos:", err);
        throw err; 
      }
    }
  }
  
  throw new Error("❌ [Seed] No se pudo conectar a la base de datos.");
}