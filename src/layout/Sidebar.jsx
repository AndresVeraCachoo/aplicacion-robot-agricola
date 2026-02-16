// src/layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

function Sidebar({ onClose }) {
  const { userRole, logout } = useAuth();
  const [avatar, setAvatar] = useState(
    localStorage.getItem("userAvatar") || DEFAULT_AVATAR
  );

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
      <div className="sidebar-header-mobile">
        <h3>Menú</h3>
        <button className="close-menu-btn" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="sidebar-profile-header">
        <Link
          to="/app/profile"
          className="profile-link-wrapper"
          onClick={onClose}
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
            <Link to="/app/dashboard" onClick={onClose}>
              Inicio
            </Link>
          </li>

          {/* Nuevo enlace al panel de Control */}
          <li>
            <Link to="/app/control" onClick={onClose}>
              Control Remoto
            </Link>
          </li>

          <li>
            <Link to="/app/data" onClick={onClose}>
              Datos
            </Link>
          </li>
          {(userRole === "admin" || userRole === "operador") && (
            <li>
              <Link to="/app/camera" onClick={onClose}>
                Cámara
              </Link>
            </li>
          )}
          <li>
            <Link to="/app/history" onClick={onClose}>
              Historial
            </Link>
          </li>

          {userRole === "admin" && (
            <li>
              <Link to="/app/users" onClick={onClose}>
                Gestión de Usuarios
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="logout-button"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
