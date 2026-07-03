// src/pages/Control/ControlPage.jsx
import React, { useState } from "react";
import CameraFeed from "../../features/control/CameraFeed";
import ControlMap from "../../features/control/ControlMap";
import ControlPanel from "../../features/control/ControlPanel";
import JoystickOverlay from "../../features/control/components/JoystickOverlay";
import { useRobotStore } from "../../store/robotStore";
import { useKeyboardControl } from "../../hooks/useKeyboardControl";
import "./ControlPage.css";

/**
 * Componente de la página de control manual.
 * Permite controlar el robot manualmente alternando entre vista de cámara y mapa.
 * @returns {JSX.Element}
 */
const ControlPage = () => {
  const { system } = useRobotStore();
  const { handleMove, handleStop } = useKeyboardControl();

  const [mainView, setMainView] = useState("map");

  const toggleView = () => {
    setMainView((prev) => (prev === "camera" ? "map" : "camera"));
  };

  // Permite activar el PiP con teclado (Enter o Espacio)
  const handleKeyDownToggle = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleView();
    }
  };

  return (
    <div
      className={`control-page ${mainView === "camera" ? "is-camera-main" : "is-map-main"}`}
    >
      <div
        className={`control-top-row ${mainView === "camera" ? "main-camera" : "main-map"}`}
      >
        {/* === CONTENEDOR CÁMARA === */}
        <div
          className={`camera-container ${mainView === "camera" ? "is-main" : "is-pip"}`}
          onClick={mainView === "map" ? toggleView : undefined}
          /* Atributos de accesibilidad */
          onKeyDown={mainView === "map" ? handleKeyDownToggle : undefined}
          role={mainView === "map" ? "button" : undefined}
          tabIndex={mainView === "map" ? 0 : undefined}
          title={mainView === "map" ? "Toca para ampliar cámara" : ""}
        >
          <CameraFeed />

          {mainView === "map" && <div className="pip-expand-icon">⤢</div>}

          {/* OVERLAY DE JOYSTICK EN PANTALLA */}
          {system.mode === "MANUAL" && (
            <JoystickOverlay onMove={handleMove} onStop={handleStop} />
          )}
        </div>

        {/* === CONTENEDOR MAPA === */}
        <div
          className={`map-container ${mainView === "map" ? "is-main" : "is-pip"}`}
          onClick={mainView === "camera" ? toggleView : undefined}
          /* Atributos de accesibilidad */
          onKeyDown={mainView === "camera" ? handleKeyDownToggle : undefined}
          role={mainView === "camera" ? "button" : undefined}
          tabIndex={mainView === "camera" ? 0 : undefined}
          title={mainView === "camera" ? "Toca para ampliar mapa" : ""}
        >
          <ControlMap isPip={mainView === "camera"} />

          {mainView === "camera" && <div className="pip-expand-icon">⤢</div>}
        </div>
      </div>

      <div className="control-bottom-row">
        <ControlPanel />
      </div>
    </div>
  );
};

export default ControlPage;

