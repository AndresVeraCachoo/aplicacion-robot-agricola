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
import "./App.css";

// Componente para proteger rutas privadas
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth(); // <-- Aquí se usa useAuth()
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
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;
