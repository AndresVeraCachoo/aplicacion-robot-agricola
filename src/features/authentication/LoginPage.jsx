// src/features/authentication/LoginPage.jsx
import React from "react";
import "./LoginPage.css";
import { useAuth } from "../../hooks/useAuth"; // <-- Importa el hook

function LoginPage() {
  const { login } = useAuth(); // <-- Aquí se usa useAuth()

  // No necesitamos handleSubmit ni el formulario
  // Los botones llamarán a login() directamente

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Bienvenido</h2>

        {/* Contenedor para los botones de rol */}
        <div className="role-button-container">
          <button className="role-button admin" onClick={() => login("admin")}>
            Entrar como Administrador
          </button>

          <button
            className="role-button operator"
            onClick={() => login("operador")}
          >
            Entrar como Operador
          </button>

          <button className="role-button user" onClick={() => login("usuario")}>
            Entrar como Usuario
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
