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
  } = useRobotStore();

  const { addToast } = useToast();

  const lastEmergencyState = useRef(system.emergencyStop);
  const rtlAlertFired = useRef(false);
  const connectionAlertFired = useRef(false);

  useEffect(() => {
    fetchInitialData();
    connectSocket();
    return () => disconnectSocket();
  }, [fetchInitialData, connectSocket, disconnectSocket]);

  // 1. Notificación de Conexión
  useEffect(() => {
    if (isConnected && !connectionAlertFired.current) {
      addToast(
        t("notifications.connectionSuccess", "Conectado al Robot Agrícola"),
        "success",
      );
      connectionAlertFired.current = true;
    } else if (!isConnected) {
      connectionAlertFired.current = false;
    }
  }, [isConnected, addToast, t]);

  // 2. Vigilancia de PARADA DE EMERGENCIA
  useEffect(() => {
    if (!isConnected) {
      lastEmergencyState.current = system.emergencyStop;
      return;
    }

    if (system.emergencyStop !== lastEmergencyState.current) {
      if (system.emergencyStop) {
        addToast(
          t("notifications.emergencyActive", "Parada de Emergencia Activada"),
          "error",
        );
      } else {
        addToast(
          t("notifications.systemReady", "Sistemas en Línea"),
          "success",
        );
      }
      lastEmergencyState.current = system.emergencyStop;
    }
  }, [system.emergencyStop, isConnected, addToast, t]);

  // 3. Vigilancia de BATERÍA Y RTL (INTELIGENTE)
  useEffect(() => {
    if (!isConnected) return;

    // Si el estado cambia a RTL_ACTIVE (Retorno a la Base)
    if (system.status === "RTL_ACTIVE" && !rtlAlertFired.current) {
      // Notificamos al agricultor
      addToast(
        t(
          "notifications.rtlActive",
          "Batería justa. Volviendo a base automáticamente para recargar.",
        ),
        "warning",
      );
      rtlAlertFired.current = true;
    }

    // Resetear el seguro cuando el robot ya no esté volviendo a la base (cuando llegue a CHARGING o pase a MANUAL/IDLE)
    if (system.status !== "RTL_ACTIVE") {
      rtlAlertFired.current = false;
    }
  }, [system.status, isConnected, addToast, t]);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={closeMobileSidebar} />
      {isSidebarOpen && window.innerWidth <= 768 && (
        <button
          className="sidebar-overlay"
          onClick={toggleSidebar}
          aria-label={t("modal.close", "Cerrar")}
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
