// src/pages/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react"; // Importamos useCallback
import axios from "axios";
import Modal from "../components/Modal";
import "./UserManagementPage.css";
import { useToast } from "../context/ToastContext";

const API_URL = "http://localhost:3001/api/users";

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { addToast } = useToast();

  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: "",
    password: "",
    role: "usuario",
  });

  // CORRECCIÓN: Envolvemos fetchUsers en useCallback
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(API_URL);
      setUsers(response.data);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      addToast("No se pudieron cargar los usuarios.", "error");
    }
  }, [addToast]);

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
        addToast(
          `Usuario "${userData.name}" actualizado correctamente`,
          "success"
        );
      } else {
        if (!userData.password) {
          addToast(
            "La contraseña es obligatoria para crear usuarios.",
            "warning"
          );
          return;
        }
        await axios.post(API_URL, userData);
        addToast(`Usuario "${userData.name}" creado con éxito`, "success");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Error al guardar usuario:", err);
      addToast(
        err.response?.data?.error || "Error al guardar el usuario.",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        addToast("Usuario eliminado correctamente", "success");
        fetchUsers();
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        addToast("Error al eliminar el usuario.", "error");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="user-management-container">
      <h1>Gestión de Usuarios</h1>
      <button className="btn-create" onClick={openCreateModal}>
        + Crear Nuevo Usuario
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
                Editar
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(user.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={currentUser.id ? "Editar Usuario" : "Crear Usuario"}
      >
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
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
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={currentUser.password}
              onChange={handleChange}
              placeholder={
                currentUser.id ? "(Dejar vacío para no cambiar)" : ""
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              name="role"
              value={currentUser.role}
              onChange={handleChange}
            >
              <option value="usuario">Usuario</option>
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
