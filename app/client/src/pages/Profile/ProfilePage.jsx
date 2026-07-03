// src/pages/Profile/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { userService } from "../../services/userService";
import { useTranslation } from "react-i18next";
import ProfileInfoCard from "../../features/profile/components/ProfileInfoCard";
import PasswordSection from "../../features/profile/components/PasswordSection";
import "./ProfilePage.css";

const DEFAULT_AVATAR = "/avatars/robot-fondo-verde.png";

/**
 * Componente principal de la página del perfil de usuario.
 * Actúa como orquestador para mostrar la información del usuario, cambiar el avatar y actualizar la contraseña.
 * 
 * @returns {JSX.Element} El componente de la página de perfil.
 */
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
        const responseData = await userService.getProfile();
        setProfile(responseData);
        if (responseData.avatar) {
          setAvatarUrl(responseData.avatar);
          localStorage.setItem("userAvatar", responseData.avatar);
          globalThis.dispatchEvent(new Event("avatarUpdated"));
        }
      } catch (error) {
        console.error(error);
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
      await userService.updatePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setMessage({ text: t("profile.successUpdate"), type: "success" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error(error);
      setMessage({ text: t("profile.errorServer"), type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!selectedAvatar) return;
    setIsSavingAvatar(true);
    try {
      const responseData = await userService.updateAvatar(selectedAvatar);
      setAvatarUrl(responseData.user.avatar);
      localStorage.setItem("userAvatar", responseData.user.avatar);
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
        <ProfileInfoCard
          profile={profile}
          avatarUrl={avatarUrl}
          showAvatarSelector={showAvatarSelector}
          setShowAvatarSelector={setShowAvatarSelector}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          isSavingAvatar={isSavingAvatar}
          handleAvatarSave={handleAvatarSave}
          t={t}
        />

        <PasswordSection
          passwords={passwords}
          handleChange={handleChange}
          handlePasswordSubmit={handlePasswordSubmit}
          isLoading={isLoading}
          message={message}
          t={t}
        />
      </div>
    </div>
  );
}

export default ProfilePage;