// src/pages/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import "./UserManagementPage.css";
import { useToast } from "../context/ToastContext";

const API_URL = "http://localhost:3001/api/users";

function UserManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { addToast } = useToast();

  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: "",
    password: "",
    role: "usuario",
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(API_URL);
      setUsers(response.data);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      addToast(t("users.errorLoad"), "error");
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setCurrentUser({ id: null, name: "", password: "", role: "usuario" });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser({ ...user, password: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = {
      name: currentUser.name,
      role: currentUser.role,
      password: currentUser.password,
    };

    try {
      if (currentUser.id) {
        await axios.put(`${API_URL}/${currentUser.id}`, userData);
        addToast(`${t("users.updated")} "${userData.name}"`, "success");
      } else {
        if (!userData.password) {
          addToast(t("users.pwdRequired"), "warning");
          return;
        }
        await axios.post(API_URL, userData);
        addToast(`${t("users.created")} "${userData.name}"`, "success");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Error al guardar usuario:", err);
      // Ignoramos el mensaje del backend para mantener la internacionalización
      addToast(t("users.errorSave"), "error");
    }
  };

  const handleDelete = async (id) => {
    if (globalThis.confirm(t("users.confirmDelete"))) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        addToast(t("users.deleted"), "success");
        fetchUsers();
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        // Ignoramos el mensaje del backend para mantener la internacionalización
        addToast(t("users.errorDelete"), "error");
      }
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
              <button
                className="btn-delete"
                onClick={() => handleDelete(user.id)}
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
            <label htmlFor="password">{t("users.password")}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={currentUser.password}
              onChange={handleChange}
              placeholder={currentUser.id ? t("users.passwordPlaceholder") : ""}
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
    </div>
  );
}

export default UserManagementPage;
