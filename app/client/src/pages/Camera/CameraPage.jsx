// src/pages/Camera/CameraPage.jsx
import React from "react";
import "./CameraPage.css";
// 1. Importa el componente del mapa
import MapView from "../../features/dashboard/components/MapView";
import MainCameraFeed from "../../features/camera/components/MainCameraFeed";

/**
 * Componente principal de la página de la cámara.
 * Muestra el feed de vídeo principal en modo inmersivo junto con un minimapa.
 * @returns {JSX.Element}
 */
function CameraPage() {
  return (
    // 2. Contenedor principal para el modo inmersivo
    <div className="camera-page-immersive">
      {/* 3. Feed de vídeo principal */}
      <MainCameraFeed />

      {/* 4. Contenedor para el minimapa */}
      <div className="minimap-container">
        {/* Usamos el MapView existente, pero se mostrará pequeño por el CSS */}
        <MapView />
      </div>
    </div>
  );
}
export default CameraPage;
