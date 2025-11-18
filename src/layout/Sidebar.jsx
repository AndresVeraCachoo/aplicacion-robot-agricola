// src/layout/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

function Sidebar() {
  // 1. Ahora también sacamos la función 'logout' del hook
  const { userRole, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Navegación</h3>
      </div>

      {/* 2. La navegación ocupa el espacio central */}
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/app/dashboard">Inicio</Link>
          </li>
          <li>
            <Link to="/app/data">Datos</Link>
          </li>
          {(userRole === "admin" || userRole === "operador") && (
            <li>
              <Link to="/app/camera">Cámara</Link>
            </li>
          )}
          <li>
            <Link to="/app/history">Historial</Link>
          </li>
          {userRole === "admin" && (
            <li>
              <Link to="/app/users">Gestión de Usuarios</Link>
            </li>
          )}
        </ul>
      </nav>

      {/* 3. Pie de la barra lateral con el botón de Logout */}
      <div className="sidebar-footer">
        <button onClick={logout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
