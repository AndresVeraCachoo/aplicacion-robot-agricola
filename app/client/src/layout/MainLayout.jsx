// src/layout/MainLayout.jsx
import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import "../pages/Dashboard/DashboardPage.css";
import { useRobotStore } from "../store/robotStore.js";
import { useToastStore } from "../store/toastStore";

/**
 * Componente principal de la estructura de la aplicación.
 * Contiene el Sidebar, Header y el contenedor central para el contenido dinámico.
 * Gestiona alertas globales de conexión, batería y emergencias.
 * @returns {JSX.Element}
 */
function MainLayout() {
  const { t } = useTranslation();

  const {
    isSidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    fetchInitialData,
    connectSocket,
    disconnectSocket,
    isConnected,
    system,
  } = useRobotStore();

  const { addToast } = useToastStore();

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

    if (system.status === "RTL_ACTIVE" && !rtlAlertFired.current) {
      addToast(
        t(
          "notifications.rtlActive",
          "Batería justa. Volviendo a base automáticamente para recargar.",
        ),
        "warning",
      );
      rtlAlertFired.current = true;
    }

    if (system.status !== "RTL_ACTIVE") {
      rtlAlertFired.current = false;
    }
  }, [system.status, isConnected, addToast, t]);

  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={closeMobileSidebar} />
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
