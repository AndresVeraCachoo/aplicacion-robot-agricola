// src/components/MainLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";

// Rutas actualizadas. Ahora son importaciones locales.
import Header from "./Header";
import Sidebar from "./Sidebar";

// Esta ruta de importación de CSS sigue siendo correcta
import "../features/dashboard/Dashboard.css";

function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="dashboard-layout">
      {isSidebarOpen && <Sidebar />}
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
