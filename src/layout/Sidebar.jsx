// src/layout/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth"; // <-- 1. Importamos el hook

function Sidebar() {
  const { userRole } = useAuth(); // <-- 2. Obtenemos el rol del usuario

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Navegación</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {/* REGLAS DE VISUALIZACIÓN:
            Admin: TODO
            Operador: Todo MENOS Gestión de Usuarios
            Usuario: Solo Inicio, Datos e Historial
          */}

          {/* visible para: Admin, Operador, Usuario */}
          <li>
            <Link to="/app/dashboard">Inicio</Link>
          </li>

          {/* visible para: Admin, Operador, Usuario */}
          <li>
            <Link to="/app/data">Datos</Link>
          </li>

          {/* visible para: Admin, Operador */}
          {(userRole === "admin" || userRole === "operador") && (
            <li>
              <Link to="/app/camera">Cámara</Link>
            </li>
          )}

          {/* visible para: Admin, Operador, Usuario */}
          <li>
            <Link to="/app/history">Historial</Link>
          </li>

          {/* visible para: Admin */}
          {userRole === "admin" && (
            <li>
              <Link to="/app/users">Gestión de Usuarios</Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
