// src/pages/Dashboard.jsx
import React, { useState } from "react";
import Header from "../features/dashboard/Header";
import MapView from "../features/dashboard/MapView";
import Sidebar from "../features/dashboard/Sidebar";
import "./Dashboard.css"; // La ruta sigue siendo correcta porque el CSS se movió con el JSX

function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Esta función cambia el estado para mostrar u ocultar la Sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="dashboard-layout">
      {/* La barra lateral solo se muestra si isSidebarOpen es true */}
      {isSidebarOpen && <Sidebar />}

      <div className="main-content-wrapper">
        {/* Le pasamos la función toggleSidebar al Header */}
        <Header onMenuClick={toggleSidebar} />
        <MapView />
      </div>
    </div>
  );
}

export default Dashboard;
