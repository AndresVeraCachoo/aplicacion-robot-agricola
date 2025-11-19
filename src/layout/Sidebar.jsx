// src/layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

function Sidebar() {
  const { userRole, logout } = useAuth();
  // Estado local para el avatar
  const [avatar, setAvatar] = useState(
    localStorage.getItem("userAvatar") || DEFAULT_AVATAR
  );

  // Escuchar cambios en el avatar
  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatar(localStorage.getItem("userAvatar") || DEFAULT_AVATAR);
    };
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  return (
    <aside className="sidebar">
      {/* Tarjeta de Perfil en lugar de "Navegación" */}
      <div className="sidebar-profile-header">
        <Link
          to="/app/profile"
          className="profile-link-wrapper"
          title="Ir a mi perfil"
        >
          <div className="profile-image-container">
            <img src={avatar} alt="Usuario" className="sidebar-avatar" />
          </div>
          <div className="profile-text">
            <span className="profile-greeting">Mi Perfil</span>
            <span className="profile-role-label">{userRole}</span>
          </div>
        </Link>
      </div>

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

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
