// src/components/Dashboard.jsx
import React, { useState } from "react";
import Header from "./Header";
import MapView from "./MapView";
import Sidebar from "./Sidebar";
import "./Dashboard.css";

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
