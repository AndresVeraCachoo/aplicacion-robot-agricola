// src/layout/MainLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
// Importaciones relativas desde src/layout/
import Header from "./Header";
import Sidebar from "./Sidebar";
// Importaciones que salen de layout hacia otras carpetas
import "../features/dashboard/Dashboard.css";
import { useRobotStore } from "../store/robotStore";

function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768
  );

  // Extraemos acciones
  const fetchInitialData = useRobotStore((state) => state.fetchInitialData);
  const connectSocket = useRobotStore((state) => state.connectSocket);
  const disconnectSocket = useRobotStore((state) => state.disconnectSocket);

  useEffect(() => {
    console.log("🚀 Iniciando Dashboard en Tiempo Real...");

    // 1. Carga inicial (Snapshot)
    fetchInitialData();

    // 2. Conectar al stream (WebSockets)
    connectSocket();

    // 3. Limpieza
    return () => {
      disconnectSocket();
    };
  }, []); // Array vacío = Solo al montar

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {isSidebarOpen && <Sidebar onClose={closeMobileSidebar} />}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
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
