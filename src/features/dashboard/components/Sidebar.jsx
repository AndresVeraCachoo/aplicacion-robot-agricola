// src/components/Sidebar.jsx
import React from "react";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Navegación</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <a href="#">Datos</a>
          </li>
          <li>
            <a href="#">Cámara</a>
          </li>
          <li>
            <a href="#">Historial</a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
