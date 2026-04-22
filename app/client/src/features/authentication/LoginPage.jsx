// src/features/authentication/LoginPage.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./LoginPage.css";
import { useAuth } from "../../hooks/useAuth";

function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !password) {
      setError(t("login.errorRequired"));
      return;
    }

    const result = await login(name, password);

    if (!result.success) {
      setError(t("login.invalidCreds"));
    }
  };

  // Función robusta para alternar idioma
  const toggleLanguage = () => {
    // i18n.resolvedLanguage es más seguro que i18n.language
    const currentLang = i18n.resolvedLanguage || i18n.language || "es";
    const nextLang = currentLang.startsWith("es") ? "en" : "es";
    i18n.changeLanguage(nextLang);
  };

  // Determinamos qué texto mostrar en el botón basándonos en el idioma activo
  const currentLangCode = (
    i18n.resolvedLanguage ||
    i18n.language ||
    "es"
  ).startsWith("es")
    ? "ES"
    : "EN";

  return (
    <div className="login-container">
      <div className="login-box" style={{ position: "relative" }}>
        {/* Botón de cambio de idioma. MUY IMPORTANTE el type="button" */}
        <button
          type="button"
          className="login-lang-btn"
          onClick={toggleLanguage}
          title={
            currentLangCode === "ES" ? "Switch to English" : "Cambiar a Español"
          }
        >
          🌍 {currentLangCode}
        </button>

        <h2>{t("login.welcome")}</h2>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">{t("login.username")}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("login.pwdText")}</label>
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
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
