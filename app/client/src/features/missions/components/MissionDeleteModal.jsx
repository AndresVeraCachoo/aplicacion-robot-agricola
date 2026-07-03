import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Modal from "../../../components/Modal";

export function MissionDeleteModal({ isOpen, onClose, onDeleteConfirm }) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("missions.confirmDeleteTitle", "Eliminar Misión")}
    >
      <div className="delete-modal-content">
        <p className="delete-modal-text">
          {t(
            "missions.confirmDelete",
            "¿Estás seguro de que deseas eliminar esta misión? Esta acción no se puede deshacer.",
          )}
        </p>
        <div className="delete-modal-actions">
          <button
            onClick={onClose}
            className="btn-modal-cancel"
          >
            {t("users.cancel", "Cancelar")}
          </button>
          <button
            onClick={onDeleteConfirm}
            className="btn-modal-delete"
          >
            {t("missions.card.deleteBtn", "Eliminar")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

MissionDeleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
};
