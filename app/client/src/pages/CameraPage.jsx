// src/pages/CameraPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./CameraPage.css";
// 1. Importa el componente del mapa
import MapView from "../features/dashboard/components/MapView";

function CameraPage() {
  const { t } = useTranslation();

  return (
    // 2. Contenedor principal para el modo inmersivo
    <div className="camera-page-immersive">
      {/* 3. Placeholder del feed de vídeo principal */}
      <div className="main-camera-feed">
        <div className="camera-lens-large">
          <div className="camera-reflection-large"></div>
        </div>
        <span className="camera-label-large">{t("camera.feed")}</span>
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
