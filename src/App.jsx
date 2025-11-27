// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./features/authentication/LoginPage";
import Dashboard from "./features/dashboard/Dashboard";
import MainLayout from "./layout/MainLayout";
import CameraPage from "./pages/CameraPage";
import DataPage from "./pages/DataPage";
import HistoryPage from "./pages/HistoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
// 1. Importar la nueva página
import EnergyPage from "./pages/EnergyPage";
import "./App.css";

// Componente para proteger rutas privadas
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="camera" element={<CameraPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<UserManagementPage />} />

        {/* 2. Definir la ruta oculta (no está en Sidebar) */}
        <Route path="energy" element={<EnergyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;
