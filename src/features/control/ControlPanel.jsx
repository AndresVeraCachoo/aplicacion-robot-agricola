// src/features/control/ControlPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useRobotStore } from "../../store/robotStore";
import "./ControlPanel.css";

const ControlPanel = () => {
  const { controlMode, setControlMode, sendManualMove } = useRobotStore();
  const [activeKeys, setActiveKeys] = useState({});

  // 1. SOLUCIÓN: Usamos useCallback para estabilizar la función
  const processMovement = useCallback(
    (keys) => {
      let x = 0;
      let y = 0;

      if (keys["ArrowUp"]) y += 1;
      if (keys["ArrowDown"]) y -= 1;
      if (keys["ArrowRight"]) x += 1;
      if (keys["ArrowLeft"]) x -= 1;

      sendManualMove({ x, y });
    },
    [sendManualMove]
  ); // Dependencia: sendManualMove (estable desde el store)

  // Manejo de eventos de teclado
  useEffect(() => {
    if (controlMode !== "MANUAL") return;

    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setActiveKeys((prev) => {
          if (prev[e.key]) return prev; // Evitar repetición
          const newKeys = { ...prev, [e.key]: true };
          processMovement(newKeys);
          return newKeys;
        });
      }
    };

    const handleKeyUp = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setActiveKeys((prev) => {
          const newKeys = { ...prev };
          delete newKeys[e.key];
          processMovement(newKeys);
          return newKeys;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // 2. SOLUCIÓN: Ahora podemos incluir processMovement en las dependencias sin causar loops
  }, [controlMode, processMovement]);

  const handleModeToggle = () => {
    const newMode = controlMode === "AUTO" ? "MANUAL" : "AUTO";
    setControlMode(newMode);
    // Al cambiar de modo, asegurar parada
    if (newMode === "AUTO") sendManualMove({ x: 0, y: 0 });
  };

  // Botones de interfaz
  const handleBtnStart = (direction) => {
    if (controlMode !== "MANUAL") return;

    const map = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    };
    setActiveKeys((prev) => ({ ...prev, [map[direction]]: true }));

    let x = 0,
      y = 0;
    if (direction === "up") y = 1;
    if (direction === "down") y = -1;
    if (direction === "left") x = -1;
    if (direction === "right") x = 1;
    sendManualMove({ x, y });
  };

  const handleBtnStop = () => {
    if (controlMode !== "MANUAL") return;
    setActiveKeys({});
    sendManualMove({ x: 0, y: 0 });
  };

  return (
    <div className="control-panel-container">
      <div className="mode-switch-wrapper">
        <span
          className={`mode-label ${controlMode === "AUTO" ? "active" : ""}`}
        >
          AUTO
        </span>
        <label className="switch">
          <input
            type="checkbox"
            checked={controlMode === "MANUAL"}
            onChange={handleModeToggle}
          />
          <span className="slider round"></span>
        </label>
        <span
          className={`mode-label ${controlMode === "MANUAL" ? "active" : ""}`}
        >
          MANUAL
        </span>
      </div>

      <div
        className={`manual-controls ${
          controlMode === "AUTO" ? "disabled" : ""
        }`}
      >
        <div className="d-pad">
          <div className="d-row">
            <button
              className={`d-btn up ${activeKeys["ArrowUp"] ? "pressed" : ""}`}
              onMouseDown={() => handleBtnStart("up")}
              onMouseUp={handleBtnStop}
              onTouchStart={() => handleBtnStart("up")}
              onTouchEnd={handleBtnStop}
            >
              ▲
            </button>
          </div>
          <div className="d-row middle">
            <button
              className={`d-btn left ${
                activeKeys["ArrowLeft"] ? "pressed" : ""
              }`}
              onMouseDown={() => handleBtnStart("left")}
              onMouseUp={handleBtnStop}
              onTouchStart={() => handleBtnStart("left")}
              onTouchEnd={handleBtnStop}
            >
              ◀
            </button>
            <button className="d-btn center" onClick={handleBtnStop}>
              ●
            </button>
            <button
              className={`d-btn right ${
                activeKeys["ArrowRight"] ? "pressed" : ""
              }`}
              onMouseDown={() => handleBtnStart("right")}
              onMouseUp={handleBtnStop}
              onTouchStart={() => handleBtnStart("right")}
              onTouchEnd={handleBtnStop}
            >
              ▶
            </button>
          </div>
          <div className="d-row">
            <button
              className={`d-btn down ${
                activeKeys["ArrowDown"] ? "pressed" : ""
              }`}
              onMouseDown={() => handleBtnStart("down")}
              onMouseUp={handleBtnStop}
              onTouchStart={() => handleBtnStart("down")}
              onTouchEnd={handleBtnStop}
            >
              ▼
            </button>
          </div>
        </div>
        <p className="instruction-text">
          Usa las flechas del teclado o los botones para mover el robot.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
