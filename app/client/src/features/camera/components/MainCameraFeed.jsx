// src/features/camera/components/MainCameraFeed.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./MainCameraFeed.css";

/**
 * Componente que muestra el feed de vídeo principal de la cámara.
 * @returns {JSX.Element} El componente de la cámara.
 */
function MainCameraFeed() {
  const { t } = useTranslation();

  return (
    <div className="main-camera-feed">
      <div className="camera-lens-large">
        <div className="camera-reflection-large"></div>
      </div>
      <span className="camera-label-large">{t("camera.feed")}</span>
      <div className="camera-rec-dot-large"></div>
    </div>
  );
}

export default MainCameraFeed;
