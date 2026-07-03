// src/features/userManagement/components/UserDeleteModal.jsx
import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../components/Modal";

/**
 * Componente modal que pide confirmación antes de eliminar un usuario.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Indica si el modal de eliminación está abierto.
 * @param {Function} props.onClose - Función a llamar para cerrar el modal.
 * @param {Function} props.onConfirm - Función a llamar para confirmar la eliminación.
 * @param {Function} props.t - Función de traducción.
 * @returns {JSX.Element} El modal de confirmación de eliminación.
 */
function UserDeleteModal({ isOpen, onClose, onConfirm, t }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("users.confirmDeleteTitle", "Eliminar Usuario")}
    >
      <div className="delete-modal-content">
        <p className="delete-modal-text">
          {t(
            "users.confirmDelete",
            "¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
          )}
        </p>
        <div className="delete-modal-actions">
          <button onClick={onClose} className="btn-modal-cancel">
            {t("users.cancel", "Cancelar")}
          </button>
          <button onClick={onConfirm} className="btn-modal-delete">
            {t("users.delete", "Eliminar")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

UserDeleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default UserDeleteModal;
