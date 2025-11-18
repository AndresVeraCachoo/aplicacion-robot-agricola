/* eslint-disable no-undef */
/* eslint-env node */
// server/index.js (Versión completa y segura)
import express from "express";
import cors from "cors";
import pg from "pg";
import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Pool } = pg;

const app = express();
const PORT = 3001;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Configuración de la Base de Datos
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "robot_dashboard_db",
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// ==========================================
// MIDDLEWARES DE SEGURIDAD (Los "Porteros")
// ==========================================

// 1. Verifica si el usuario tiene un Token válido
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN" -> "TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido o expirado" });
    }
    req.user = user;
    next();
  });
};

// 2. Verifica si el usuario es Administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
  }
  next();
};

// ==========================================
// RUTAS DE LA API
// ==========================================

// --- 1. LOGIN (Genera el Token) ---
app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: "Nombre de usuario y contraseña requeridos" });
  }

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- 2. GESTIÓN DE USUARIOS (PROTEGIDAS: Solo Admin con Token) ---

// Obtener usuarios
app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, role FROM usuarios ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Crear usuario
app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
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

// Actualizar usuario
app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
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

// Eliminar usuario
app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// --- 3. RUTAS DEL ROBOT (PROTEGIDAS: Solo usuarios logueados) ---
// NOTA: Se ha añadido 'authenticateToken' a estas rutas

// ESTADO DEL ROBOT
app.get("/api/robot/estado", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM robot_estado WHERE id = 1");
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

// DATOS/HISTORIAL DEL ROBOT
app.get("/api/robot/datos", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT lat, lon FROM robot_datos ORDER BY timestamp ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log("Conectado a la base de datos 'robot_dashboard_db'");
});