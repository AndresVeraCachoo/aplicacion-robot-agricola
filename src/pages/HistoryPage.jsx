// src/pages/HistoryPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./HistoryPage.css"; // Crearemos este archivo

function HistoryPage() {
  const { t } = useTranslation();

  return (
    <div className="history-container">
      <h2>{t("history.title")}</h2>
      <p>{t("history.description")}</p>
    </div>
  );
}
export default HistoryPage;
