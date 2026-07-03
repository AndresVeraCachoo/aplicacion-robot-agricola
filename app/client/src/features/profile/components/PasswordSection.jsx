// src/features/profile/components/PasswordSection.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Componente que muestra el formulario para actualizar la contraseña del usuario.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.passwords - Estado de las contraseñas (actual, nueva, confirmación).
 * @param {Function} props.handleChange - Manejador de cambios en los inputs del formulario.
 * @param {Function} props.handlePasswordSubmit - Manejador del envío del formulario.
 * @param {boolean} props.isLoading - Indica si se está guardando la nueva contraseña.
 * @param {Object} props.message - Mensaje de feedback (éxito o error).
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} La sección de actualización de contraseña.
 */
function PasswordSection({
  passwords,
  handleChange,
  handlePasswordSubmit,
  isLoading,
  message,
  t,
}) {
  return (
    <section className="password-section">
      <h2>{t("profile.security")}</h2>
      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}
      <form onSubmit={handlePasswordSubmit} className="password-form">
        <div className="form-group">
          <label>{t("profile.currentPassword")}</label>
          <input
            type="password"
            name="currentPassword"
            value={passwords.currentPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>{t("profile.newPassword")}</label>
          <input
            type="password"
            name="newPassword"
            value={passwords.newPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>{t("profile.confirmPassword")}</label>
          <input
            type="password"
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
          {isLoading ? t("profile.saving") : t("profile.updatePassword")}
        </button>
      </form>
    </section>
  );
}

PasswordSection.propTypes = {
  passwords: PropTypes.shape({
    currentPassword: PropTypes.string,
    newPassword: PropTypes.string,
    confirmPassword: PropTypes.string,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  handlePasswordSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  message: PropTypes.shape({
    text: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  t: PropTypes.func.isRequired,
};

export default PasswordSection;
