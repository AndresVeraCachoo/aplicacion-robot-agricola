// src/features/authentication/LoginPage.jsx
import React from 'react';
import './LoginPage.css';

// Recibimos la función onLogin como un "prop" desde App.jsx
function LoginPage({ onLogin }) {

  // Esta función se ejecuta cuando el usuario envía el formulario
  const handleSubmit = (event) => {
    event.preventDefault(); // Evita que la página se recargue
    console.log('Intento de login...');
    onLogin(); // Llamamos a la función que nos pasó App.jsx
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>
        {/* Cuando el formulario se envía, llama a handleSubmit */}
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