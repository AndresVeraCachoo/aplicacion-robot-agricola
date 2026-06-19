// src/features/dashboard/Dashboard.jsx
import React from "react";
import MapView from "./components/MapView";
import "./Dashboard.css";

/**
 * Componente principal del Dashboard.
 * Renderiza la vista principal del mapa agronómico.
 * @returns {JSX.Element}
 */
function Dashboard() {
  return (
    <div className="dashboard-page-container">
      {/* La "tarjeta" que envuelve el mapa*/}
      <div className="map-widget-wrapper">
        <MapView />
      </div>
    </div>
  );
}

export default Dashboard;
