import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // ----- Consultas (GET) -----
  const { data: profile = { name: "", role: "" }, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const responseData = await userService.getProfile();
      if (responseData.avatar) {
        localStorage.setItem("userAvatar", responseData.avatar);
        globalThis.dispatchEvent(new Event("avatarUpdated"));
      }
      return responseData;
    }
  });

  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("userAvatar") || DEFAULT_AVATAR);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");

  useEffect(() => {
    if (isError) {
      setMessage({ text: t("profile.errorLoadProfile"), type: "error" });
    }
  }, [isError, t]);

  // Sincronizar el estado del avatarUrl con la respuesta
  useEffect(() => {
    if (profile.avatar) {
      setAvatarUrl(profile.avatar);
    }
  }, [profile.avatar]);

  // ----- Mutaciones (POST, PUT, DELETE) -----
  const updatePasswordMutation = useMutation({
    mutationFn: (data) => userService.updatePassword(data),
    onSuccess: () => {
      setMessage({ text: t("profile.successUpdate"), type: "success" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      console.error(error);
      setMessage({ text: t("profile.errorServer"), type: "error" });
    }
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (avatar) => userService.updateAvatar(avatar),
    onSuccess: (responseData) => {
      setAvatarUrl(responseData.user.avatar);
      localStorage.setItem("userAvatar", responseData.user.avatar);
      setShowAvatarSelector(false);
      globalThis.dispatchEvent(new Event("avatarUpdated"));
      setMessage({ text: t("profile.avatarSuccess"), type: "success" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      console.error(error); 
      setMessage({ text: t("profile.errorServer"), type: "error" });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ text: t("profile.errorMismatch"), type: "error" });
      return;
    }
    updatePasswordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
  };

  const handleAvatarSave = () => {
    if (!selectedAvatar) return;
    updateAvatarMutation.mutate(selectedAvatar);
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
          isSavingAvatar={updateAvatarMutation.isPending}
          handleAvatarSave={handleAvatarSave}
          t={t}
        />

        <PasswordSection
          passwords={passwords}
          handleChange={handleChange}
          handlePasswordSubmit={handlePasswordSubmit}
          isLoading={updatePasswordMutation.isPending}
          message={message}
          t={t}
        />
      </div>
    </div>
  );
}

export default ProfilePage;