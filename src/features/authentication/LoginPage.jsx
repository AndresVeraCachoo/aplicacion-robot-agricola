// src/features/authentication/LoginPage.jsx
import React, { useState } from "react";
import "./LoginPage.css";
import { useAuth } from "../../hooks/useAuth";

function LoginPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Limpia errores previos

    if (!name || !password) {
      setError("Por favor, introduce nombre y contraseña");
      return;
    }

    const result = await login(name, password); // Llama al nuevo 'login'

    if (!result.success) {
      setError(result.message || "Credenciales inválidas");
    }
    // Si tiene éxito, AuthContext redirige automáticamente
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Bienvenido</h2>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Nombre de Usuario</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
