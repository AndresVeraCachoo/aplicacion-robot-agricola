// src/App.jsx
import React, { useState } from "react";
import LoginPage from "./features/authentication/LoginPage";
import Dashboard from "./features/dashboard/Dashboard";
import "./App.css";

function App() {
  // El estado `isLoggedIn` controla qué página se muestra.
  // Por defecto, el usuario no ha iniciado sesión.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Esta función se pasará al componente LoginPage.
  // Cuando se llame, cambiará el estado a `true`.
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="app">
      {isLoggedIn ? (
        // Si el usuario ha iniciado sesión, muestra el Dashboard
        <Dashboard />
      ) : (
        // Si no, muestra la página de Login y pásale la función handleLogin
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
