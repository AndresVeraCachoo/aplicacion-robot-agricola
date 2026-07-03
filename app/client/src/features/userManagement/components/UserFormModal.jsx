// src/features/userManagement/components/UserFormModal.jsx
import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../components/Modal";

/**
 * Componente modal que muestra el formulario para crear o editar un usuario.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Indica si el modal está abierto.
 * @param {Function} props.onClose - Función a llamar para cerrar el modal.
 * @param {Object} props.currentUser - Los datos del usuario actual en edición (o uno vacío si es nuevo).
 * @param {Function} props.handleChange - Manejador de cambios de los inputs.
 * @param {Function} props.handleSubmit - Manejador del envío del formulario.
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} El modal del formulario de usuario.
 */
function UserFormModal({
  isOpen,
  onClose,
  currentUser,
  handleChange,
  handleSubmit,
  t,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentUser.id ? t("users.editUser") : t("users.createUser")}
    >
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-group">
          <label htmlFor="name">{t("users.name")}</label>
          <input
            type="text"
            id="name"
            name="name"
            value={currentUser.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">
            {t("users.email", "Correo Electrónico (Opcional)")}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={currentUser.email}
            onChange={handleChange}
            placeholder={t("users.emailPlaceholder", "usuario@empresa.com")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t("users.password")}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={currentUser.password}
            onChange={handleChange}
            placeholder={
              currentUser.id
                ? t("users.passwordPlaceholder")
                : t(
                    "users.pwdOrEmailHint",
                    "Dejar vacío para autogenerar si hay email"
                  )
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">{t("users.role")}</label>
          <select
            id="role"
            name="role"
            value={currentUser.role}
            onChange={handleChange}
          >
            <option value="usuario">{t("users.roleUser")}</option>
            <option value="operador">{t("users.roleOperator")}</option>
            <option value="admin">{t("users.roleAdmin")}</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {t("users.cancel")}
          </button>
          <button type="submit" className="btn-submit">
            {t("users.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

UserFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    email: PropTypes.string,
    password: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default UserFormModal;
