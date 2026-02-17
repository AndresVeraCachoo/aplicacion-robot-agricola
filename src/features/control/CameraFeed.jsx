// src/features/control/CameraFeed.jsx
import React from "react";
import { useRobotStore } from "../../store/robotStore";
import "./CameraFeed.css";

const CameraFeed = () => {
  const { system } = useRobotStore();

  // Video ID de ejemplo.
  const YOUTUBE_VIDEO_ID = "tYkuy4u1wT0";
  const youtubeSrc = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${YOUTUBE_VIDEO_ID}&showinfo=0&modestbranding=1`;

  return (
    <div className="camera-feed-container">
      {/* YouTube Iframe */}
      <div className="video-wrapper">
        <iframe
          src={youtubeSrc}
          title="Robot Camera Feed"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="camera-iframe"
        ></iframe>
      </div>

      {/* Crosshair (Mira) */}
      <div className="camera-crosshair"></div>

      {/* HUD Bottom */}
      <div className="camera-hud-bottom">
        <div className="hud-metric">
          <span className="label">SPD</span>
          <span className="value">{system.speed} m/s</span>
        </div>
        <div className="hud-metric">
          <span className="label">HDG</span>
          <span className="value">{system.heading}°</span>
        </div>
      </div>
    </div>
  );
};

export default CameraFeed;
