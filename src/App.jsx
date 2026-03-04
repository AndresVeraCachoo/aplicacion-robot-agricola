// src/App.jsx
import React from "react";
import PropTypes from "prop-types"; // 1. Importación añadida para validación
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
import EnergyPage from "./pages/EnergyPage";
// Importar la nueva página de Control
import ControlPage from "./pages/ControlPage";
import "./App.css";

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// 2. Validación de propiedades para satisfacer a SonarLint (S6774)
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

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
        {/* Nueva ruta de control */}
        <Route path="control" element={<ControlPage />} />
        <Route path="camera" element={<CameraPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="energy" element={<EnergyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;
