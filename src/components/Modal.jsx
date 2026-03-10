// src/components/Modal.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./Modal.css";

function Modal({ isOpen, onClose, title, children }) {
  const { t } = useTranslation();
  // Doble estado para permitir la animación de salida
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Pequeño retraso para que CSS detecte el cambio y anime
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Esperamos 300ms (lo que dura la animación CSS) antes de destruirlo
      setTimeout(() => setIsRendered(false), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  return (
    <div className={`modal-overlay ${isVisible ? "visible" : ""}`}>
      {/* Botón invisible de fondo para cerrar */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("modal.close")}
        tabIndex={-1}
        className="modal-backdrop-btn"
      />

      <div className={`modal-content ${isVisible ? "visible" : ""}`}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            aria-label={t("modal.close")}
          >
            &times;
          </button>
        )}

        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
          </div>
        )}

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  title: PropTypes.string,
  children: PropTypes.node,
};

export default Modal;
