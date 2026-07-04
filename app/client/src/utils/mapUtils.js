import L from "leaflet";

export const GEOMAN_DRAW_CONTROLS = {
  drawMarker: false,
  drawCircleMarker: false,
  drawPolyline: false,
  drawRectangle: true,
  drawPolygon: true,
  drawCircle: false,
  editMode: true,
  dragMode: true,
  cutPolygon: true,
  rotateMode: true,
  removalMode: true,
};

export const createRobotArrowIcon = (heading) =>
  new L.DivIcon({
    className: "robot-arrow-icon",
    html: `<div style="transform: rotate(${heading}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s linear;"><img src="/robot-arrow.svg" alt="Robot" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" /></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -20],
  });
