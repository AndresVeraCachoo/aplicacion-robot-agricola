import {
  setSimulationZone,
  clearSimulationZone,
  setRobotMode,
  setManualVelocity,
  setSpeedLimit,
  queueNavPoint,
  setNavigationTarget,
  pauseSimulation,
  resumeSimulation,
  cancelSimulation
} from "../simulator.js";

export const setupSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`Cliente conectado`);

    socket.on("client:update_zone", setSimulationZone);
    socket.on("client:clear_zone", clearSimulationZone);
    socket.on("client:change_mode", setRobotMode);
    socket.on("client:manual_control", ({ x, y }) => setManualVelocity(x, y));
    socket.on("client:set_speed_limit", setSpeedLimit);
    socket.on("client:queue_point", queueNavPoint);
    socket.on("client:navigate_to", ({ lat, lon, clearQueue }) => setNavigationTarget(lat, lon, clearQueue));
    socket.on("client:pause_mission", pauseSimulation);
    socket.on("client:resume_mission", resumeSimulation);
    socket.on("client:cancel_mission", cancelSimulation);

    socket.on("disconnect", () => console.log(`Cliente desconectado [Socket ID: ${socket.id}]`));
  });
};