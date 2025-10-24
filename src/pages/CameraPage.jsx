// src/pages/CameraPage.jsx
import React from "react";
import "./CameraPage.css";
// 1. Importa el componente del mapa
import MapView from "../features/dashboard/components/MapView";

function CameraPage() {
  return (
    // 2. Contenedor principal para el modo inmersivo
    <div className="camera-page-immersive">
      {/* 3. Placeholder del feed de vídeo principal */}
      <div className="main-camera-feed">
        <div className="camera-lens-large">
          <div className="camera-reflection-large"></div>
        </div>
        <span className="camera-label-large">CAM 1 FEED</span>
        <div className="camera-rec-dot-large"></div>
      </div>

      {/* 4. Contenedor para el minimapa */}
      <div className="minimap-container">
        {/* Usamos el MapView existente, pero se mostrará pequeño por el CSS */}
        <MapView />
      </div>
    </div>
  );
}
export default CameraPage;
