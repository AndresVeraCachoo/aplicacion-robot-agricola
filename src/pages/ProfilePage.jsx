// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ProfilePage.css";

const API_URL = "http://localhost:3001/api/users";

// Avatar por defecto (silueta genérica)
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

function ProfilePage() {
  // Estado para la información del perfil
  const [profile, setProfile] = useState({
    name: "",
    role: "",
  });

  // Solo leemos la imagen para mostrarla, ya no hay lógica de edición
  const [avatarUrl] = useState(() => {
    return localStorage.getItem("userAvatar") || DEFAULT_AVATAR;
  });

  // Estado para el cambio de contraseña
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Estados de UI
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  // 1. Cargar datos del usuario al montar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/profile`);
        setProfile(response.data);
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        setMessage({
          text: "No se pudieron cargar los datos del usuario.",
          type: "error",
        });
      }
    };
    fetchProfile();
  }, []);

  // Manejar cambios en los inputs de contraseña
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  // 2. Manejar el envío del formulario de contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({
        text: "Las contraseñas nuevas no coinciden.",
        type: "error",
      });
      return;
    }

    if (passwords.newPassword.length < 4) {
      setMessage({
        text: "La nueva contraseña es demasiado corta.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      await axios.put(`${API_URL}/profile/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });

      setMessage({
        text: "¡Contraseña actualizada con éxito!",
        type: "success",
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      const errorMsg =
        error.response?.data?.error || "Error al conectar con el servidor.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>Mi Perfil</h1>
      </header>

      <div className="profile-content-grid">
        {/* Columna Izquierda: Foto y Datos Básicos */}
        <section className="profile-info-card">
          <div className="avatar-section">
            <img
              src={avatarUrl}
              alt="Perfil"
              className="profile-avatar-large"
            />

            {/* Botón decorativo, sin funcionalidad */}
            <button
              className="btn-change-photo"
              style={{ cursor: "default", opacity: 0.7 }}
              title="Próximamente"
            >
              Cambiar Foto (URL)
            </button>
          </div>

          <div className="info-details">
            <div className="info-row">
              <strong>Nombre:</strong>{" "}
              <span>{profile.name || "Cargando..."}</span>
            </div>
            <div className="info-row">
              <strong>Rol:</strong>{" "}
              <span style={{ textTransform: "capitalize" }}>
                {profile.role || "..."}
              </span>
            </div>
          </div>
        </section>

        {/* Columna Derecha: Cambio de Contraseña */}
        <section className="password-section">
          <h2>Seguridad</h2>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

          <form onSubmit={handleSubmit} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Contraseña Actual</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Nueva Contraseña</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-save-password"
              disabled={isLoading}
            >
              {isLoading ? "Guardando..." : "Actualizar Contraseña"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
