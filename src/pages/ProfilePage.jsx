// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./ProfilePage.css";

const API_URL = "http://localhost:3001/api/users";

// Avatar por defecto (silueta genérica)
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

function ProfilePage() {
  const { t } = useTranslation();

  const [profile, setProfile] = useState({
    name: "",
    role: "",
  });

  const [avatarUrl] = useState(() => {
    return localStorage.getItem("userAvatar") || DEFAULT_AVATAR;
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile(response.data);
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        setMessage({
          text: t("profile.errorLoadProfile"),
          type: "error",
        });
      }
    };
    fetchProfile();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({
        text: t("profile.errorMismatch"),
        type: "error",
      });
      return;
    }

    if (passwords.newPassword.length < 4) {
      setMessage({
        text: t("profile.errorShort"),
        type: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/profile/password`,
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage({
        text: t("profile.successUpdate"),
        type: "success",
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      // 👇 AQUÍ ESTÁ LA MAGIA: Ignoramos el backend y forzamos el idioma local
      setMessage({ text: t("profile.errorServer"), type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>{t("profile.title")}</h1>
      </header>

      <div className="profile-content-grid">
        <section className="profile-info-card">
          <div className="avatar-section">
            <img
              src={avatarUrl}
              alt="Perfil"
              className="profile-avatar-large"
            />

            <button
              className="btn-change-photo"
              style={{ cursor: "default", opacity: 0.7 }}
              title={t("profile.comingSoon")}
            >
              {t("profile.changePhotoBtn")}
            </button>
          </div>

          <div className="info-details">
            <div className="info-row">
              <strong>{t("profile.name")}</strong>{" "}
              <span>{profile.name || t("profile.loading")}</span>
            </div>
            <div className="info-row">
              <strong>{t("profile.role")}</strong>{" "}
              <span style={{ textTransform: "capitalize" }}>
                {profile.role || "..."}
              </span>
            </div>
          </div>
        </section>

        <section className="password-section">
          <h2>{t("profile.security")}</h2>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

          <form onSubmit={handleSubmit} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                {t("profile.currentPassword")}
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">{t("profile.newPassword")}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                {t("profile.confirmPassword")}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-save-password"
              disabled={isLoading}
            >
              {isLoading ? t("profile.saving") : t("profile.updatePassword")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
