// src/features/authentication/LoginPage.jsx
import React from "react";
import "./LoginPage.css";
import { useAuth } from "../../hooks/useAuth"; // <-- Importa el hook

function LoginPage() {
  const { login } = useAuth(); // <-- Aquí se usa useAuth()

  const handleSubmit = (event) => {
    event.preventDefault();
    login(); // Llama a la función del contexto
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input type="text" placeholder="Usuario" required />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Contraseña" required />
          </div>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
