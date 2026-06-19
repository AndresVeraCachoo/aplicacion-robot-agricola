// src/features/authentication/LoginPage.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./LoginPage.css";
import { useAuth } from "../../hooks/useAuth";

const LANGUAGES = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
];

/**
 * Componente de la página de inicio de sesión.
 * Permite al usuario autenticarse y cambiar el idioma de la aplicación.
 * @returns {JSX.Element}
 */
function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

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

  const currentLang = LANGUAGES.find(l => (i18n.resolvedLanguage || i18n.language || "es").startsWith(l.code)) || LANGUAGES[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsLangMenuOpen(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        
        {/* Desplegable de Idioma */}
        <div className="login-lang-container">
          <button
            type="button"
            className="login-lang-btn"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
          >
            <span>{currentLang.label}</span>
          </button>

          {isLangMenuOpen && (
            <div className="login-lang-dropdown">
              {LANGUAGES.filter(l => l.code !== currentLang.code).map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  className="login-lang-option"
                  onClick={() => changeLanguage(lang.code)}
                >
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <h2>{t("login.welcome")}</h2>

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
          <button type="submit" className="login-submit-button">{t("login.submit")}</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;