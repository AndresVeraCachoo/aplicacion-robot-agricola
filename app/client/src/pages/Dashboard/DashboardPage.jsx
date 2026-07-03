// src/pages/Dashboard/DashboardPage.jsx
import React from "react";
import MapView from "../../features/dashboard/components/MapView";
import "./DashboardPage.css";

/**
 * Componente principal del Dashboard.
 * Renderiza la vista principal del mapa agronómico.
 * @returns {JSX.Element}
 */
function DashboardPage() {
  return (
    <div className="dashboard-page-container">
      {/* La "tarjeta" que envuelve el mapa*/}
      <div className="map-widget-wrapper">
        <MapView />
      </div>
    </div>
  );
}

export default DashboardPage;
