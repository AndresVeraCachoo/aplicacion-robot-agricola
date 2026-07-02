// src/pages/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import "./UserManagementPage.css";
import { useToast } from "../context/ToastContext";

const API_URL = "/users";

/**
 * Componente de la página de gestión de usuarios.
 * Permite listar, crear, editar y eliminar usuarios.
 * @returns {JSX.Element}
 */
function UserManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { addToast } = useToast();

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
      const response = await httpClient.get(API_URL);
      setUsers(response.data);
    } catch (err) {
      console.error("Error al cargar los usuarios:", err);
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
        await httpClient.put(`${API_URL}/${currentUser.id}`, userData);
        addToast(
          `${t("users.updated", "Usuario actualizado:")} "${userData.name}"`,
          "success",
        );
      } else {
        if (!userData.password && !userData.email) {
          addToast(t("users.pwdOrEmailRequired", "Debe proporcionar una contraseña o un email válido"), "warning");
          return;
        }
        await httpClient.post(API_URL, userData);
        addToast(`${t("users.created")} "${userData.name}"`, "success");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Error al guardar el usuario:", err);
      const serverError = err.response?.data?.error || t("users.errorSave");
      addToast(serverError, "error");
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await httpClient.delete(`${API_URL}/${userToDelete}`);
      addToast(
        t("users.deleted", "Usuario eliminado correctamente"),
        "success",
      );
      fetchUsers();
      setUserToDelete(null);
    } catch (err) {
      console.error("Error al eliminar el usuario:", err);
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

      <div className="user-list">
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <div className="user-actions">
              <button className="btn-edit" onClick={() => openEditModal(user)}>
                {t("users.edit")}
              </button>

              {/* 🚀 BOTÓN DESHABILITADO PARA LOS USUARIOS PROTEGIDOS (1, 2, 3) */}
              <button
                className="btn-delete"
                onClick={() => setUserToDelete(user.id)}
                disabled={["1", "2", "3"].includes(String(user.id))}
                style={
                  ["1", "2", "3"].includes(String(user.id))
                    ? {
                        opacity: 0.4,
                        cursor: "not-allowed",
                        backgroundColor: "#9ca3af",
                        color: "#f3f4f6",
                      }
                    : {}
                }
                title={
                  ["1", "2", "3"].includes(String(user.id))
                    ? t(
                        "users.protectedTooltip",
                        "Usuario del sistema protegido",
                      )
                    : ""
                }
              >
                {t("users.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={currentUser.id ? t("users.editUser") : t("users.createUser")}
      >
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">{t("users.name")}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={currentUser.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">{t("users.email", "Correo Electrónico (Opcional)")}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={currentUser.email}
              onChange={handleChange}
              placeholder={t("users.emailPlaceholder", "usuario@empresa.com")}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t("users.password")}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={currentUser.password}
              onChange={handleChange}
              placeholder={currentUser.id ? t("users.passwordPlaceholder") : t("users.pwdOrEmailHint", "Dejar vacío para autogenerar si hay email")}
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">{t("users.role")}</label>
            <select
              id="role"
              name="role"
              value={currentUser.role}
              onChange={handleChange}
            >
              <option value="usuario">{t("users.roleUser")}</option>
              <option value="operador">{t("users.roleOperator")}</option>
              <option value="admin">{t("users.roleAdmin")}</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={closeModal}>
              {t("users.cancel")}
            </button>
            <button type="submit" className="btn-submit">
              {t("users.save")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title={t("users.confirmDeleteTitle", "Eliminar Usuario")}
      >
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <p style={{ marginBottom: "20px", color: "var(--text-main)" }}>
            {t(
              "users.confirmDelete",
              "¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.",
            )}
          </p>
          <div
            style={{ display: "flex", gap: "15px", justifyContent: "center" }}
          >
            <button
              onClick={() => setUserToDelete(null)}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "transparent",
                color: "var(--text-main)",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {t("users.cancel", "Cancelar")}
            </button>
            <button
              onClick={executeDeleteUser}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {t("users.delete", "Eliminar")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
