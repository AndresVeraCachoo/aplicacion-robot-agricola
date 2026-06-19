// src/features/control/CameraFeed.jsx
import React from "react";
import { useRobotStore } from "../../store/robotStore";
import "./CameraFeed.css";

/**
 * Componente que muestra el feed de la cámara del robot.
 * Utiliza un iframe de YouTube como simulación de vídeo en tiempo real.
 * @returns {JSX.Element}
 */
const CameraFeed = () => {
  const { system } = useRobotStore();

  // Video ID de ejemplo.
  const YOUTUBE_VIDEO_ID = "tYkuy4u1wT0";
  const youtubeSrc = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${YOUTUBE_VIDEO_ID}&showinfo=0&modestbranding=1`;

  return (
    <div className="camera-feed-container">
      {/* Iframe de YouTube */}
      <div className="video-wrapper">
        <iframe
          src={youtubeSrc}
          title="Robot Camera Feed"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="camera-iframe"
        ></iframe>
      </div>

      {/* Crosshair (Mira) */}
      <div className="camera-crosshair"></div>

      {/* HUD Inferior */}
      <div className="camera-hud-bottom">
        <div className="hud-metric">
          <span className="label">SPD</span>
          {/* También he añadido un toFixed(1) opcional por si la velocidad tiene muchos decimales */}
          <span className="value">
            {Number(system.speed || 0).toFixed(1)} m/s
          </span>
        </div>
        <div className="hud-metric">
          <span className="label">HDG</span>
          <span className="value">{Math.round(system.heading || 0)}°</span>
        </div>
      </div>
    </div>
  );
};

export default CameraFeed;
