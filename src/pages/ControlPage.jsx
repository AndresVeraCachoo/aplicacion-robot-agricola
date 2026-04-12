// src/pages/ControlPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import CameraFeed from "../features/control/CameraFeed";
import ControlMap from "../features/control/ControlMap";
import ControlPanel from "../features/control/ControlPanel";
import { useRobotStore } from "../store/robotStore";
import "./ControlPage.css";

const ControlPage = () => {
  const { system, sendManualMove } = useRobotStore();

  const [mainView, setMainView] = useState("map");

  const handleMove = useCallback(
    (x, y) => {
      if (system.mode !== "MANUAL") return;
      sendManualMove({ x, y });
    },
    [system.mode, sendManualMove],
  );

  const handleStop = useCallback(() => {
    if (system.mode !== "MANUAL") return;
    sendManualMove({ x: 0, y: 0 });
  }, [system.mode, sendManualMove]);

  const toggleView = () => {
    setMainView((prev) => (prev === "camera" ? "map" : "camera"));
  };

  // 🛡️ FIX SonarQube S1082: Permite activar el PiP con teclado (Enter o Espacio)
  const handleKeyDownToggle = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleView();
    }
  };

  // CONTROL POR TECLADO (Flechas y WASD)
  useEffect(() => {
    if (system.mode !== "MANUAL") return;

    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      if (e.repeat) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleMove(0, 1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleMove(0, -1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handleMove(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handleMove(1, 0);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      const controlKeys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "W",
        "A",
        "S",
        "D",
      ];
      if (controlKeys.includes(e.key)) {
        handleStop();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, [system.mode, handleMove, handleStop]);

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
          /* 🛡️ FIX SonarQube S7735: Cambiado !== "camera" por === "map" */
          onClick={mainView === "map" ? toggleView : undefined}
          /* 🛡️ FIX SonarQube S6848 y S1082: Atributos de accesibilidad */
          onKeyDown={mainView === "map" ? handleKeyDownToggle : undefined}
          role={mainView === "map" ? "button" : undefined}
          tabIndex={mainView === "map" ? 0 : undefined}
          title={mainView === "map" ? "Toca para ampliar cámara" : ""}
        >
          <CameraFeed />

          {/* 🛡️ FIX SonarQube S7735: Cambiado !== "camera" por === "map" */}
          {mainView === "map" && <div className="pip-expand-icon">⤢</div>}

          {/* OVERLAY DE JOYSTICK EN PANTALLA */}
          {system.mode === "MANUAL" && (
            <div className="joystick-overlay">
              <button
                className="joy-btn up"
                onMouseDown={() => handleMove(0, 1)}
                onMouseUp={handleStop}
                onMouseLeave={handleStop}
                onTouchStart={() => handleMove(0, 1)}
                onTouchEnd={handleStop}
              >
                ▲
              </button>
              <div className="joy-row">
                <button
                  className="joy-btn left"
                  onMouseDown={() => handleMove(-1, 0)}
                  onMouseUp={handleStop}
                  onMouseLeave={handleStop}
                  onTouchStart={() => handleMove(-1, 0)}
                  onTouchEnd={handleStop}
                >
                  ◀
                </button>
                <button
                  className="joy-btn down"
                  onMouseDown={() => handleMove(0, -1)}
                  onMouseUp={handleStop}
                  onMouseLeave={handleStop}
                  onTouchStart={() => handleMove(0, -1)}
                  onTouchEnd={handleStop}
                >
                  ▼
                </button>
                <button
                  className="joy-btn right"
                  onMouseDown={() => handleMove(1, 0)}
                  onMouseUp={handleStop}
                  onMouseLeave={handleStop}
                  onTouchStart={() => handleMove(1, 0)}
                  onTouchEnd={handleStop}
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === CONTENEDOR MAPA === */}
        <div
          className={`map-container ${mainView === "map" ? "is-main" : "is-pip"}`}
          /* 🛡️ FIX SonarQube S7735: Cambiado !== "map" por === "camera" */
          onClick={mainView === "camera" ? toggleView : undefined}
          /* 🛡️ FIX SonarQube S6848 y S1082: Atributos de accesibilidad */
          onKeyDown={mainView === "camera" ? handleKeyDownToggle : undefined}
          role={mainView === "camera" ? "button" : undefined}
          tabIndex={mainView === "camera" ? 0 : undefined}
          title={mainView === "camera" ? "Toca para ampliar mapa" : ""}
        >
          {/* 🛡️ FIX SonarQube S7735 */}
          <ControlMap isPip={mainView === "camera"} />

          {/* 🛡️ FIX SonarQube S7735 */}
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
