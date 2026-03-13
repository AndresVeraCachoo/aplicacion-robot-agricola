// src/layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { userRole, logout } = useAuth();
  const [avatar, setAvatar] = useState(
    localStorage.getItem("userAvatar") || DEFAULT_AVATAR,
  );

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatar(localStorage.getItem("userAvatar") || DEFAULT_AVATAR);
    };
    globalThis.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      globalThis.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay-bg ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-label={t("modal.close") || "Close sidebar"}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header-mobile">
          <h3>{t("sidebar.menu")}</h3>
          <button className="close-menu-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sidebar-profile-header">
          <Link
            to="/app/profile"
            className="profile-link-wrapper"
            onClick={onClose}
          >
            <div className="profile-image-container">
              <img src={avatar} alt="Usuario" className="sidebar-avatar" />
            </div>
            <div className="profile-text">
              <span className="profile-greeting">{t("sidebar.profile")}</span>
              <span className="profile-role-label">{userRole}</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/app/dashboard" onClick={onClose}>
                {t("sidebar.home")}
              </Link>
            </li>
            <li>
              <Link to="/app/control" onClick={onClose}>
                {t("sidebar.remoteControl")}
              </Link>
            </li>
            <li>
              <Link to="/app/data" onClick={onClose}>
                {t("sidebar.data")}
              </Link>
            </li>
            {(userRole === "admin" || userRole === "operador") && (
              <li>
                <Link to="/app/camera" onClick={onClose}>
                  {t("sidebar.camera")}
                </Link>
              </li>
            )}
            <li>
              <Link to="/app/missions" onClick={onClose}>
                {t("sidebar.missions")}
              </Link>
            </li>
            {userRole === "admin" && (
              <li>
                <Link to="/app/users" onClick={onClose}>
                  {t("sidebar.userManagement")}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => {
              logout();
              if (onClose) onClose();
            }}
            className="logout-button"
          >
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Sidebar;
