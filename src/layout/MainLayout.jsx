// src/layout/MainLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import "../features/dashboard/Dashboard.css";
import { useRobotStore } from "../store/robotStore.js";
import { useToast } from "../context/ToastContext.jsx";

function MainLayout() {
  const { t } = useTranslation();
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768,
  );

  const {
    fetchInitialData,
    connectSocket,
    disconnectSocket,
    isConnected,
    system,
    battery,
  } = useRobotStore();

  const { addToast } = useToast();

  // Refs para evitar notificaciones iniciales falsas
  const lastEmergencyState = useRef(system.emergencyStop);
  const batteryAlertFired = useRef(false);

  useEffect(() => {
    fetchInitialData();
    connectSocket();
    return () => disconnectSocket();
  }, [fetchInitialData, connectSocket, disconnectSocket]);

  // 1. Notificación de Conexión
  useEffect(() => {
    // Esta sí queremos que salga al recargar para confirmar que hay conexión
    if (isConnected) {
      addToast(t("notifications.connectionSuccess"), "success");
    }
  }, [isConnected, addToast, t]);

  // 2. Vigilancia de PARADA DE EMERGENCIA
  useEffect(() => {
    // SEGURO: Si no estamos conectados, solo sincronizamos el estado en silencio
    if (!isConnected) {
      lastEmergencyState.current = system.emergencyStop;
      return;
    }

    if (system.emergencyStop !== lastEmergencyState.current) {
      if (system.emergencyStop) {
        addToast(t("notifications.emergencyActive"), "error");
      } else {
        addToast(t("notifications.systemReady"), "success");
      }
      lastEmergencyState.current = system.emergencyStop;
    }
  }, [system.emergencyStop, isConnected, addToast, t]);

  // 3. Vigilancia de BATERÍA BAJA
  useEffect(() => {
    // SEGURO: Evitar falsos positivos cuando arranca en 0% o no hay conexión
    if (
      !isConnected ||
      battery.percentage === 0 ||
      battery.percentage === null
    ) {
      return;
    }

    // Si baja del 20% y no hemos avisado aún
    if (
      battery.percentage <= 20 &&
      !batteryAlertFired.current &&
      battery.status !== "CHARGING"
    ) {
      addToast(t("notifications.batteryLow"), "warning");
      batteryAlertFired.current = true;
    }

    // Resetear el aviso si se pone a cargar o sube la batería
    if (battery.percentage > 25 || battery.status === "CHARGING") {
      batteryAlertFired.current = false;
    }
  }, [battery.percentage, battery.status, isConnected, addToast, t]);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {isSidebarOpen && <Sidebar onClose={closeMobileSidebar} />}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <button
          className="sidebar-overlay"
          onClick={toggleSidebar}
          aria-label={t("modal.close")}
          style={{ border: "none", padding: 0 }}
        ></button>
      )}
      <div className="main-content-wrapper">
        <Header onMenuClick={toggleSidebar} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
