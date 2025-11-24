// src/layout/MainLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import "../features/dashboard/Dashboard.css";
import { useRobotStore } from "../store/robotStore.js";
import { useToast } from "../context/ToastContext.jsx";

function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768
  );

  const { fetchInitialData, connectSocket, disconnectSocket, isConnected } =
    useRobotStore();
  const { addToast } = useToast();

  useEffect(() => {
    console.log("🚀 Iniciando Dashboard...");
    fetchInitialData();
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [fetchInitialData, connectSocket, disconnectSocket]);

  // Efecto para notificaciones de conexión
  useEffect(() => {
    if (isConnected) {
      addToast("Conexión establecida con el robot", "success");
    }
  }, [isConnected, addToast]);

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
