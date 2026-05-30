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

/**
 * Inicializa y configura el servidor de WebSockets.
 * Actúa como una capa de transporte bidireccional de baja latencia entre el frontend y el motor de simulación.
 * @param {import('socket.io').Server} io - Instancia del servidor de Socket.IO.
 * @returns {void}
 */
export const setupSockets = (io) => {
  io.on("connection", (socket) => {
    // Registramos el ID del socket para facilitar la trazabilidad en logs de concurrencia
    console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // Mapeo de eventos directos al simulador. Se pasan las referencias de las funciones
    // para evitar envoltorios innecesarios (wrappers) y optimizar el tiempo de ejecución.
    socket.on("client:update_zone", setSimulationZone);
    socket.on("client:clear_zone", clearSimulationZone);
    socket.on("client:change_mode", setRobotMode);
    
    // Se desestructuran los objetos complejos recibidos del cliente antes de inyectarlos al motor de física
    socket.on("client:manual_control", ({ x, y }) => setManualVelocity(x, y));
    socket.on("client:set_speed_limit", setSpeedLimit);
    socket.on("client:queue_point", queueNavPoint);
    socket.on("client:navigate_to", ({ lat, lon, clearQueue }) => setNavigationTarget(lat, lon, clearQueue));
    
    socket.on("client:pause_mission", pauseSimulation);
    socket.on("client:resume_mission", resumeSimulation);
    socket.on("client:cancel_mission", cancelSimulation);

    socket.on("disconnect", () => console.log(`[Socket] Cliente desconectado: ${socket.id}`));
  });
};