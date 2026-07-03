// src/pages/UserManagement/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { userService } from "../../services/userService";
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
  const [users, setUsers] = useState([]);
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

  const fetchUsers = useCallback(async () => {
    try {
      const responseData = await userService.getAll();
      setUsers(responseData);
    } catch {
      addToast(t("users.errorLoad"), "error");
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
        await userService.update(currentUser.id, userData);
        addToast(
          `${t("users.updated", "Usuario actualizado:")} "${userData.name}"`,
          "success",
        );
      } else {
        if (!userData.password && !userData.email) {
          addToast(t("users.pwdOrEmailRequired", "Debe proporcionar una contraseña o un email válido"), "warning");
          return;
        }
        await userService.create(userData);
        addToast(`${t("users.created")} "${userData.name}"`, "success");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      const serverError = err.response?.data?.error || t("users.errorSave");
      addToast(serverError, "error");
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await userService.delete(userToDelete);
      addToast(
        t("users.deleted", "Usuario eliminado correctamente"),
        "success",
      );
      fetchUsers();
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

