// src/features/control/components/JoystickOverlay.jsx
import React from "react";
import PropTypes from "prop-types";
import "./JoystickOverlay.css";

/**
 * Componente que renderiza un joystick virtual en pantalla.
 * Permite controlar el movimiento manualmente cuando el modo es MANUAL.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Function} props.onMove - Función a llamar al iniciar el movimiento.
 * @param {Function} props.onStop - Función a llamar al detener el movimiento.
 * @returns {JSX.Element} El componente de Joystick.
 */
function JoystickOverlay({ onMove, onStop }) {
  return (
    <div className="joystick-overlay">
      <button
        className="joy-btn up"
        onMouseDown={() => onMove(0, 1)}
        onMouseUp={onStop}
        onMouseLeave={onStop}
        onTouchStart={() => onMove(0, 1)}
        onTouchEnd={onStop}
      >
        ▲
      </button>
      <div className="joy-row">
        <button
          className="joy-btn left"
          onMouseDown={() => onMove(-1, 0)}
          onMouseUp={onStop}
          onMouseLeave={onStop}
          onTouchStart={() => onMove(-1, 0)}
          onTouchEnd={onStop}
        >
          ◀
        </button>
        <button
          className="joy-btn down"
          onMouseDown={() => onMove(0, -1)}
          onMouseUp={onStop}
          onMouseLeave={onStop}
          onTouchStart={() => onMove(0, -1)}
          onTouchEnd={onStop}
        >
          ▼
        </button>
        <button
          className="joy-btn right"
          onMouseDown={() => onMove(1, 0)}
          onMouseUp={onStop}
          onMouseLeave={onStop}
          onTouchStart={() => onMove(1, 0)}
          onTouchEnd={onStop}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

JoystickOverlay.propTypes = {
  onMove: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};

export default JoystickOverlay;
