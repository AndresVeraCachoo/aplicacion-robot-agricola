// src/features/dashboard/Dashboard.jsx
import React from "react";
import MapView from "./components/MapView";
import "./Dashboard.css"; // 1. Asegúrate de que importas el CSS

function Dashboard() {
  return (
    // 2. Contenedor de la página para centrar el contenido
    <div className="dashboard-page-container">
      {/* 3. La "tarjeta" que envuelve el mapa y le da estilo */}
      <div className="map-widget-wrapper">
        <MapView />
      </div>
    </div>
  );
}

export default Dashboard;
