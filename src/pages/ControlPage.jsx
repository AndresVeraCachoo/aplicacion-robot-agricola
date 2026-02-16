// src/pages/ControlPage.jsx
import React from "react";
import ControlPanel from "../features/control/ControlPanel";
import "./ControlPage.css";

const ControlPage = () => {
  return (
    <div className="control-page">
      <header className="page-header">
        <h1>Centro de Control</h1>
        <p>Gestión de operación manual y modos de funcionamiento</p>
      </header>

      <div className="control-content">
        <ControlPanel />

        {/* Aquí podríamos añadir información adicional, logs, o un minimapa */}
        <div className="control-info-card">
          <h3>Estado del Sistema</h3>
          <p>
            Seleccione el modo <strong>MANUAL</strong> para tomar el control del
            robot mediante el teclado o la interfaz táctil.
          </p>
          <p>
            En modo <strong>AUTO</strong>, el robot seguirá su algoritmo de
            cobertura predeterminado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPage;
