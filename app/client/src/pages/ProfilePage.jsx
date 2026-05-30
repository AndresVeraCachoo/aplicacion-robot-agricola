// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./ProfilePage.css";

const API_URL = `${import.meta.env.VITE_API_URL}/users`;
const DEFAULT_AVATAR = "/avatars/robot-fondo-verde.png";
const PRESET_AVATARS = [
  "/avatars/robot-fondo-verde.png",
  "/avatars/robot-fondo-rojo.png",
  "/avatars/robot-fondo-azul.png",
  "/avatars/robot-fondo-morado.png",
  "/avatars/robot-fondo-amarillo.png",
];

function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState({ name: "", role: "" });
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("userAvatar") || DEFAULT_AVATAR);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(response.data);
        if (response.data.avatar) {
          setAvatarUrl(response.data.avatar);
          localStorage.setItem("userAvatar", response.data.avatar);
          globalThis.dispatchEvent(new Event("avatarUpdated"));
        }
      } catch (error) {
        console.error(error); // ✅ Manejo de excepción según Sonar
        setMessage({ text: t("profile.errorLoadProfile"), type: "error" });
      }
    };
    fetchProfile();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ text: t("profile.errorMismatch"), type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/profile/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ text: t("profile.successUpdate"), type: "success" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error(error); // ✅ Manejo de excepción
      setMessage({ text: t("profile.errorServer"), type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!selectedAvatar) return;
    setIsSavingAvatar(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${API_URL}/profile/avatar`, 
        { avatarUrl: selectedAvatar }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvatarUrl(response.data.user.avatar);
      localStorage.setItem("userAvatar", response.data.user.avatar);
      setShowAvatarSelector(false);
      globalThis.dispatchEvent(new Event("avatarUpdated"));
      setMessage({ text: t("profile.avatarSuccess"), type: "success" });
    } catch (error) {
      console.error(error); 
      setMessage({ text: t("profile.errorServer"), type: "error" });
    } finally {
      setIsSavingAvatar(false);
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
            <img src={avatarUrl} alt="Perfil" className="profile-avatar-large" />
            <button className="btn-change-photo" onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
              {showAvatarSelector ? t("users.cancel") : t("profile.changePhotoBtn")}
            </button>
            
            {showAvatarSelector && (
              <div className="avatar-selector-panel">
                <div className="avatar-grid">
                  {PRESET_AVATARS.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className={`avatar-option-btn ${selectedAvatar === path ? "active" : ""}`}
                      onClick={() => setSelectedAvatar(path)}
                    >
                      <img src={path} alt="Avatar option" />
                    </button>
                  ))}
                </div>
                <button className="btn-save-avatar" onClick={handleAvatarSave} disabled={!selectedAvatar || isSavingAvatar}>
                  {isSavingAvatar ? t("profile.saving") : t("profile.updateButton")}
                </button>
              </div>
            )}
          </div>
          
          <div className="info-details">
            <div className="info-row"><strong>{t("profile.name")}</strong> <span>{profile.name}</span></div>
            <div className="info-row"><strong>{t("profile.role")}</strong> <span style={{ textTransform: "capitalize" }}>{profile.role}</span></div>
          </div>
        </section>

        <section className="password-section">
          <h2>{t("profile.security")}</h2>
          {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label>{t("profile.currentPassword")}</label>
              <input type="password" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t("profile.newPassword")}</label>
              <input type="password" name="newPassword" value={passwords.newPassword} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t("profile.confirmPassword")}</label>
              <input type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn-save-password" disabled={isLoading}>
              {isLoading ? t("profile.saving") : t("profile.updatePassword")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;