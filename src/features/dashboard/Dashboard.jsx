// src/features/dashboard/Dashboard.jsx
import React from "react";
import MapView from "./components/MapView";

// Esta es la página principal del dashboard,
// solo debe mostrar el contenido específico (el mapa).
// El Header y la Sidebar ya están en MainLayout.
function Dashboard() {
  return <MapView />;
}

export default Dashboard;
