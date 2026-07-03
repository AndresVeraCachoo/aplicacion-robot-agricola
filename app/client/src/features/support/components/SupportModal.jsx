import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../components/Modal";
import httpClient from "../../../config/httpClient";
import { useToastStore } from "../../../store/toastStore";
import { useTranslation } from "react-i18next";

function SupportModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  
  const [ticketData, setTicketData] = useState({
    type: "robot",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTicketData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await httpClient.post("/support/ticket", ticketData);
      addToast(t("support.success", "Ticket enviado correctamente. El equipo técnico lo revisará."), "success");
      onClose();
      setTicketData({ type: "robot", description: "" });
    } catch (error) {
      console.error(error);
      addToast(t("support.error", "Error al enviar el ticket"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("support.title", "Soporte Técnico")}
    >
      <form onSubmit={handleSubmit} className="support-form">
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            {t("support.issueType", "Tipo de Problema")}
          </label>
          <select
            name="type"
            value={ticketData.type}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontFamily: "inherit", color: "var(--text-main)" }}
          >
            <option value="robot">{t("support.typeRobot", "Problema con el Robot")}</option>
            <option value="app">{t("support.typeApp", "Problema con la Aplicación")}</option>
            <option value="password">{t("support.typePassword", "Pérdida de Contraseña")}</option>
            <option value="other">{t("support.typeOther", "Otro")}</option>
          </select>
        </div>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            {t("support.description", "Descripción breve")}
          </label>
          <textarea
            name="description"
            value={ticketData.description}
            onChange={handleChange}
            required
            minLength={5}
            rows={4}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", resize: "vertical", fontFamily: "inherit", color: "var(--text-main)" }}
            placeholder={t("support.descPlaceholder", "Describe el problema aquí...")}
          ></textarea>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: "8px 16px", borderRadius: "4px", background: "#ef4444", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", fontFamily: "inherit" }}
          >
            {t("support.cancel", "Cancelar")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ padding: "8px 16px", borderRadius: "4px", background: "#10b981", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", fontFamily: "inherit" }}
          >
            {isSubmitting ? t("support.sending", "Enviando...") : t("support.send", "Enviar Ticket")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

SupportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SupportModal;
