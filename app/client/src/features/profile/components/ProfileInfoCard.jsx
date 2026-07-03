// src/features/profile/components/ProfileInfoCard.jsx
import React from "react";
import PropTypes from "prop-types";

const PRESET_AVATARS = [
  "/avatars/robot-fondo-verde.png",
  "/avatars/robot-fondo-rojo.png",
  "/avatars/robot-fondo-azul.png",
  "/avatars/robot-fondo-morado.png",
  "/avatars/robot-fondo-amarillo.png",
];

/**
 * Componente que muestra la información principal del perfil de usuario y permite
 * cambiar la foto de avatar.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.profile - Información del perfil (nombre y rol).
 * @param {string} props.avatarUrl - URL del avatar actual.
 * @param {boolean} props.showAvatarSelector - Estado de visibilidad del selector de avatar.
 * @param {Function} props.setShowAvatarSelector - Función para alternar el selector.
 * @param {string} props.selectedAvatar - Avatar seleccionado temporalmente.
 * @param {Function} props.setSelectedAvatar - Función para establecer el avatar seleccionado.
 * @param {boolean} props.isSavingAvatar - Indica si el avatar se está guardando.
 * @param {Function} props.handleAvatarSave - Función para confirmar el guardado del avatar.
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} La tarjeta de información del perfil.
 */
function ProfileInfoCard({
  profile,
  avatarUrl,
  showAvatarSelector,
  setShowAvatarSelector,
  selectedAvatar,
  setSelectedAvatar,
  isSavingAvatar,
  handleAvatarSave,
  t,
}) {
  return (
    <section className="profile-info-card">
      <div className="avatar-section">
        <img src={avatarUrl} alt="Perfil" className="profile-avatar-large" />
        <button
          className="btn-change-photo"
          onClick={() => setShowAvatarSelector(!showAvatarSelector)}
        >
          {showAvatarSelector ? t("users.cancel") : t("profile.changePhotoBtn")}
        </button>

        {showAvatarSelector && (
          <div className="avatar-selector-panel">
            <div className="avatar-grid">
              {PRESET_AVATARS.map((path) => (
                <button
                  key={path}
                  type="button"
                  className={`avatar-option-btn ${selectedAvatar === path ? "active" : ""}`}
                  onClick={() => setSelectedAvatar(path)}
                >
                  <img src={path} alt="Avatar option" />
                </button>
              ))}
            </div>
            <button
              className="btn-save-avatar"
              onClick={handleAvatarSave}
              disabled={!selectedAvatar || isSavingAvatar}
            >
              {isSavingAvatar ? t("profile.saving") : t("profile.updateButton")}
            </button>
          </div>
        )}
      </div>

      <div className="info-details">
        <div className="info-row">
          <strong>{t("profile.name")}</strong> <span>{profile.name}</span>
        </div>
        <div className="info-row">
          <strong>{t("profile.role")}</strong>{" "}
          <span style={{ textTransform: "capitalize" }}>{profile.role}</span>
        </div>
      </div>
    </section>
  );
}

ProfileInfoCard.propTypes = {
  profile: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
  avatarUrl: PropTypes.string.isRequired,
  showAvatarSelector: PropTypes.bool.isRequired,
  setShowAvatarSelector: PropTypes.func.isRequired,
  selectedAvatar: PropTypes.string.isRequired,
  setSelectedAvatar: PropTypes.func.isRequired,
  isSavingAvatar: PropTypes.bool.isRequired,
  handleAvatarSave: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default ProfileInfoCard;
