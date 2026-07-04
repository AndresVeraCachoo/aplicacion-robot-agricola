// src/pages/UserManagement/UserManagementPage.jsx
import React, { useState } from "react";
import { useUsers } from "../../features/userManagement/hooks/useUsers";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../store/toastStore";
import UserList from "../../features/userManagement/components/UserList";
import UserFormModal from "../../features/userManagement/components/UserFormModal";
import UserDeleteModal from "../../features/userManagement/components/UserDeleteModal";
import "./UserManagementPage.css";

/**
 * Componente principal de la página de gestión de usuarios.
 * Orquestador que permite listar, crear, editar y eliminar usuarios.
 * 
 * @returns {JSX.Element} El componente de la página de gestión de usuarios.
 */
function UserManagementPage() {
  const { t } = useTranslation();
  const { users, error, createUser, updateUser, deleteUser } = useUsers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToastStore();
  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "usuario",
  });
  const [userToDelete, setUserToDelete] = useState(null);

  if (error) {
    // Podríamos disparar un toast aquí si fuera necesario
    console.error(error);
  }

  const openCreateModal = () => {
    setCurrentUser({ id: null, name: "", email: "", password: "", role: "usuario" });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser({ ...user, password: "", email: user.email || "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = {
      name: currentUser.name,
      email: currentUser.email || undefined,
      role: currentUser.role,
      password: currentUser.password || undefined,
    };

    try {
      if (currentUser.id) {
        await updateUser(currentUser.id, userData);
        addToast(
          `${t("users.updated", "Usuario actualizado:")} "${userData.name}"`,
          "success",
        );
      } else {
        if (!userData.password && !userData.email) {
          addToast(t("users.pwdOrEmailRequired", "Debe proporcionar una contraseña o un email válido"), "warning");
          return;
        }
        await createUser(userData);
        addToast(`${t("users.created")} "${userData.name}"`, "success");
      }
      closeModal();
    } catch (err) {
      const serverError = err.response?.data?.error || t("users.errorSave");
      addToast(serverError, "error");
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete);
      addToast(
        t("users.deleted", "Usuario eliminado correctamente"),
        "success",
      );
      setUserToDelete(null);
    } catch (err) {
      // Capturamos el 409 o 403 y mostramos un mensaje amigable en vez de fallar
      if (
        err.response &&
        (err.response.status === 409 || err.response.status === 403)
      ) {
        addToast(
          t(
            "users.protectedError",
            "No puedes eliminar a los usuarios predeterminados del sistema",
          ),
          "error",
        );
      } else {
        addToast(t("users.errorDelete"), "error");
      }
      setUserToDelete(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="user-management-container">
      <h1>{t("users.title")}</h1>
      <button className="btn-create" onClick={openCreateModal}>
        {t("users.createNew")}
      </button>

      <UserList 
        users={users} 
        onEdit={openEditModal} 
        onDelete={setUserToDelete} 
        t={t} 
      />

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        currentUser={currentUser}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        t={t}
      />

      <UserDeleteModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDeleteUser}
        t={t}
      />
    </div>
  );
}

export default UserManagementPage;

