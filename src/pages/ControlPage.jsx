// src/pages/ControlPage.jsx
import React from "react";
import ControlPanel from "../features/control/ControlPanel";
import CameraFeed from "../features/control/CameraFeed";
import ControlMap from "../features/control/ControlMap";
import "./ControlPage.css";

const ControlPage = () => {
  return (
    <div className="control-page">
      <header className="page-header">
        <h1>Centro de Control</h1>
      </header>

      <div className="cockpit-grid">
        {/* Columna Izquierda: Stack de Video + Controles */}
        <div className="left-column-stack">
          <CameraFeed />

          {/* El Panel se superpone ocupando todo el espacio */}
          <div className="overlay-controls-wrapper">
            <ControlPanel />
          </div>
        </div>

        {/* Columna Derecha: Mapa */}
        <div className="right-column-map">
          <ControlMap />
        </div>
      </div>
    </div>
  );
};

export default ControlPage;
