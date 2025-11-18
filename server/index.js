/* eslint-env node */
// server/index.js (Versión completa y segura)
import express from "express";
import cors from "cors";
import pg from "pg"; 
import "dotenv/config"; 
import bcrypt from "bcrypt"; 

const { Pool } = pg; 

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "robot_dashboard_db",
  // eslint-disable-next-line no-undef
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

// --- RUTAS CRUD DE USUARIOS (Seguras con hash) ---

// 1. OBTENER TODOS los usuarios
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

// 2. CREAR un nuevo usuario
app.post("/api/users", async (req, res) => {
  const { name, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id, name, role",
      [name, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// 3. ACTUALIZAR un usuario
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
        [name, role, hashedPassword, id]
      );
    } else {
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

// 4. BORRAR un usuario
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

// --- RUTAS DE AUTENTICACIÓN Y ROBOT ---

// 5. LOGIN SEGURO (Actualizado)
app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res
      .status(400)
      .json({ error: "Nombre de usuario y contraseña requeridos" });
  }
  try {
    // PASO 1: Buscar por nombre
    const result = await pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = result.rows[0];

    // PASO 2: Verificar contraseña hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Login correcto
    res.json({ id: user.id, name: user.name, role: user.role });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 6. ESTADO DEL ROBOT
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

// 7. DATOS/HISTORIAL DEL ROBOT
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