// src/features/dashboard/Dashboard.jsx
import React from "react";
import MapView from "./components/MapView";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-page-container">
      {/* La "tarjeta" que envuelve el mapa y le da estilo premium */}
      <div className="map-widget-wrapper">
        <MapView />
      </div>
    </div>
  );
}

export default Dashboard;
