// src/layout/MainLayout.jsx
import React, { useState, useEffect } from "react"; // 1. Importa useEffect
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../features/dashboard/Dashboard.css";
import { useRobotStore } from "../store/robotStore"; // 2. Importa el store

function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  // 3. Obtenemos la acción 'fetchInitialData' del store
  const fetchInitialData = useRobotStore((state) => state.fetchInitialData);

  // 4. Usamos useEffect para llamar a la API cuando el componente se carga
  useEffect(() => {
    fetchInitialData();
    // El array vacío '[fetchInitialData]' asegura que solo se ejecute UNA VEZ
  }, [fetchInitialData]);

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
