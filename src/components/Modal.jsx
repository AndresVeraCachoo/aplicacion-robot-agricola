// src/components/Modal.jsx
import React from "react";
import "./Modal.css"; // Importa el CSS local

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null;
  }

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={handleContentClick}>
        {(title || onClose) && (
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            {onClose && (
              <button
                onClick={onClose}
                className="modal-close-button"
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
