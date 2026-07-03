// src/features/userManagement/components/UserList.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Componente que muestra la lista de usuarios en el sistema y permite 
 * realizar acciones de edición o eliminación.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Array} props.users - Lista de usuarios.
 * @param {Function} props.onEdit - Función a llamar al hacer clic en editar.
 * @param {Function} props.onDelete - Función a llamar al hacer clic en eliminar.
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} El componente de lista de usuarios.
 */
function UserList({ users, onEdit, onDelete, t }) {
  return (
    <div className="user-list">
      {users.map((user) => (
        <div key={user.id} className="user-item">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <div className="user-actions">
            <button className="btn-edit" onClick={() => onEdit(user)}>
              {t("users.edit")}
            </button>

            {/* 🚀 BOTÓN DESHABILITADO PARA LOS USUARIOS PROTEGIDOS (1, 2, 3) */}
            <button
              className={`btn-delete ${
                ["1", "2", "3"].includes(String(user.id))
                  ? "btn-delete-disabled"
                  : ""
              }`}
              onClick={() => onDelete(user.id)}
              disabled={["1", "2", "3"].includes(String(user.id))}
              title={
                ["1", "2", "3"].includes(String(user.id))
                  ? t("users.protectedTooltip", "Usuario del sistema protegido")
                  : ""
              }
            >
              {t("users.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

UserList.propTypes = {
  users: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default UserList;
