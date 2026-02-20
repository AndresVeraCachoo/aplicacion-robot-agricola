// src/pages/ControlPage.jsx
import React from "react";
import CameraFeed from "../features/control/CameraFeed";
import ControlMap from "../features/control/ControlMap";
import ControlPanel from "../features/control/ControlPanel";
import { useRobotStore } from "../store/robotStore";
import "./ControlPage.css";

const ControlPage = () => {
  const { system, sendManualMove } = useRobotStore();

  // Funciones para el Joystick virtual
  const handleMove = (x, y) => {
    if (system.mode !== "MANUAL" || system.emergencyStop) return;
    sendManualMove({ x, y });
  };

  const handleStop = () => {
    if (system.mode !== "MANUAL") return;
    sendManualMove({ x: 0, y: 0 });
  };

  return (
    <div className="control-page">
      <div className="control-top-row">
        {/* CONTENEDOR DE CÁMARA CON OVERLAY DE JOYSTICK */}
        <div className="camera-container">
          <CameraFeed />

          {/* OVERLAY DE JOYSTICK (Solo visible en Modo Manual) */}
          {system.mode === "MANUAL" && (
            <div className="joystick-overlay">
              <button
                className="joy-btn up"
                onMouseDown={() => handleMove(0, 1)}
                onMouseUp={handleStop}
                onMouseLeave={handleStop}
                onTouchStart={() => handleMove(0, 1)}
                onTouchEnd={handleStop}
                disabled={system.emergencyStop}
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
                  disabled={system.emergencyStop}
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
                  disabled={system.emergencyStop}
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
                  disabled={system.emergencyStop}
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="map-container">
          <ControlMap />
        </div>
      </div>

      <div className="control-bottom-row">
        <ControlPanel />
      </div>
    </div>
  );
};

export default ControlPage;
