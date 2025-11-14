// server/index.js (Versión con Módulos ES)
import express from "express";
import cors from "cors";
import pg from "pg"; // Importa el paquete 'pg'

const { Pool } = pg; // Extrae 'Pool' de la importación

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "robot_dashboard_db",
  password: "hsavcYt1hY2p", 
  port: 5432,
});

// --- RUTAS DE LA API ---

app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res
      .status(400)
      .json({ error: "Nombre de usuario y contraseña requeridos" });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE name = $1 AND password = $2",
      [name, password]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ id: user.id, name: user.name, role: user.role });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.get("/api/robot/estado", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM robot_estado WHERE id = 1"
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Estado del robot no encontrado" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.get("/api/robot/datos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT lat, lon FROM robot_datos ORDER BY timestamp ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- Iniciar el Servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log("Conectado a la base de datos 'robot_dashboard_db'");
});