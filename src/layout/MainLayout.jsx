// src/layout/MainLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../features/dashboard/Dashboard.css";
import { useRobotStore } from "../store/robotStore";

function MainLayout() {
  // Estado inicial inteligente: Abierto en escritorio, cerrado en móvil
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768
  );

  const fetchInitialData = useRobotStore((state) => state.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
    const intervalId = setInterval(() => {
      fetchInitialData();
    }, 2000);
    return () => clearInterval(intervalId);
  }, [fetchInitialData]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Función para cerrar el sidebar SOLO si estamos en móvil
  // Se pasa al componente Sidebar para que cierre el menú al navegar
  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Renderizado condicional del Sidebar */}
      {isSidebarOpen && <Sidebar onClose={closeMobileSidebar} />}

      {/* Si estamos en móvil y el menú está abierto, mostramos un overlay oscuro */}
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
