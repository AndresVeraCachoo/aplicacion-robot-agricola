// src/layout/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Navegación</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {/* 1. Nuevo enlace "Inicio" que lleva al Dashboard */}
          <li>
            <Link to="/app/dashboard">Inicio</Link>
          </li>

          {/* 2. Enlace "Datos" que ahora lleva a /app/data */}
          <li>
            <Link to="/app/data">Datos</Link>
          </li>

          {/* 3. Enlace "Cámara" se mantiene igual */}
          <li>
            <Link to="/app/camera">Cámara</Link>
          </li>

          {/* 4. Enlace "Historial" que ahora lleva a /app/history */}
          <li>
            <Link to="/app/history">Historial</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
