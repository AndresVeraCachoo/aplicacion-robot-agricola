// server/index.js (Versión con Módulos ES)
import express from "express";
import cors from "cors";
import pg from "pg"; // Importa el paquete 'pg'
import 'dotenv/config'; // Importa y configura dotenv

const { Pool } = pg; // Extrae 'Pool' de la importación

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "robot_dashboard_db",
  // eslint-disable-next-line no-undef
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

// --- RUTAS CRUD DE USUARIOS ---

// 1. OBTENER TODOS los usuarios (R: Read)
// (No enviamos la contraseña, solo id, name y role)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, role FROM usuarios ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 2. CREAR un nuevo usuario (C: Create)
app.post("/api/users", async (req, res) => {
  const { name, password, role } = req.body;
  // TODO: Hashear la contraseña aquí (ej. con bcrypt)
  try {
    const result = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id, name, role",
      [name, password, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// 3. ACTUALIZAR un usuario (U: Update)
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

  try {
    // Lógica para actualizar contraseña SOLO si se proporciona una nueva
    if (password) {
      // TODO: Hashear la nueva contraseña
      await pool.query(
        "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
        [name, role, password, id]
      );
    } else {
      // Actualizar solo nombre y rol
      await pool.query(
        "UPDATE usuarios SET name = $1, role = $2 WHERE id = $3",
        [name, role, id]
      );
    }
    res.json({ message: "Usuario actualizado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// 4. BORRAR un usuario (D: Delete)
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
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