// src/App.jsx
import React from "react";
import PropTypes from "prop-types";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

const LoginPage = React.lazy(() => import("./pages/Login/LoginPage"));
const DashboardPage = React.lazy(() => import("./pages/Dashboard/DashboardPage"));
const MainLayout = React.lazy(() => import("./layout/MainLayout"));
const CameraPage = React.lazy(() => import("./pages/Camera/CameraPage"));
const DataPage = React.lazy(() => import("./pages/Data/DataPage"));
const MissionsPage = React.lazy(() => import("./pages/Missions/MissionsPage"));
const UserManagementPage = React.lazy(() => import("./pages/UserManagement/UserManagementPage"));
const ProfilePage = React.lazy(() => import("./pages/Profile/ProfilePage"));
const EnergyPage = React.lazy(() => import("./pages/Energy/EnergyPage"));
const ControlPage = React.lazy(() => import("./pages/Control/ControlPage"));

/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar si está autenticado.
 * @returns {JSX.Element}
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuthStore();

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
 * Componente para proteger rutas privadas basadas en roles.
 * @param {Object} props
 * @param {Array<string>} props.allowedRoles - Roles permitidos para acceder a la ruta.
 * @param {React.ReactNode} props.children - Componentes hijos.
 * @returns {JSX.Element}
 */
function RoleRoute({ allowedRoles, children }) {
  const { userRole } = useAuthStore();
  
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    // Si no tiene permisos, lo enviamos al dashboard (inicio)
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}

RoleRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Componente principal de la aplicación.
 * Define el enrutamiento y la carga diferida de páginas.
 * @returns {JSX.Element}
 */
function App() {
  const { initAuth } = useAuthStore();

  React.useEffect(() => {
    const cleanup = initAuth();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [initAuth]);

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
          
          {/* Rutas accesibles por todos (admin, operador, usuario) */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="camera" element={<CameraPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Rutas accesibles por admin y operador (no usuario) */}
          <Route 
            path="control" 
            element={
              <RoleRoute allowedRoles={["admin", "operador"]}>
                <ControlPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="missions" 
            element={
              <RoleRoute allowedRoles={["admin", "operador"]}>
                <MissionsPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="energy" 
            element={
              <RoleRoute allowedRoles={["admin", "operador"]}>
                <EnergyPage />
              </RoleRoute>
            } 
          />

          {/* Rutas exclusivas de admin */}
          <Route 
            path="users" 
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <UserManagementPage />
              </RoleRoute>
            } 
          />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
