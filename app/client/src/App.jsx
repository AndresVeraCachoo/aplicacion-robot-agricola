// src/App.jsx
import React from "react";
import PropTypes from "prop-types";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

const LoginPage = React.lazy(() => import("./features/authentication/LoginPage"));
const Dashboard = React.lazy(() => import("./features/dashboard/Dashboard"));
const MainLayout = React.lazy(() => import("./layout/MainLayout"));
const CameraPage = React.lazy(() => import("./pages/CameraPage"));
const DataPage = React.lazy(() => import("./pages/DataPage"));
const MissionsPage = React.lazy(() => import("./pages/MissionsPage"));
const UserManagementPage = React.lazy(() => import("./pages/UserManagementPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const EnergyPage = React.lazy(() => import("./pages/EnergyPage"));
const ControlPage = React.lazy(() => import("./pages/ControlPage"));
import "./App.css";

/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar si está autenticado.
 * @returns {JSX.Element}
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth();

  // Prevenir inicio de sesión fantasma esperando a leer el localStorage
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "white",
        }}
      >
        Verificando sesión segura...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Componente principal de la aplicación.
 * Define el enrutamiento y la carga diferida de páginas.
 * @returns {JSX.Element}
 */
function App() {
  return (
    <React.Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "var(--text-main)" }}>
        Cargando aplicación...
      </div>
    }>
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
          <Route path="control" element={<ControlPage />} />
          <Route path="camera" element={<CameraPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="energy" element={<EnergyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
