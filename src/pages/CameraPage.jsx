// src/pages/CameraPage.jsx
import React from "react";
import "./CameraPage.css"; // Importamos el CSS que vamos a crear

function CameraPage() {
  return (
    <div className="camera-page-container">
      <div className="camera-feed-placeholder">
        <div className="camera-lens">
          <div className="camera-reflection"></div>
        </div>
        <span className="camera-label">CAM 1</span>
        <div className="camera-rec-dot"></div>
      </div>
    </div>
  );
}
export default CameraPage;
