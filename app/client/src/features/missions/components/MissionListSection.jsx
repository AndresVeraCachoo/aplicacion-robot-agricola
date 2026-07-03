import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export function MissionListSection({ missions, onEditMission, onDeleteClick }) {
  const { t } = useTranslation();

  return (
    <section className="mission-list-section">
      <h3>{t("missions.savedMissions")}</h3>
      <div className="mission-grid">
        {missions.map((m) => (
          <div key={m.id} className="mission-card">
            <h4>{m.name}</h4>
            <p>
              <strong className="accent-text">
                {t("missions.card.data")}:
              </strong>{" "}
              {m.taskType || "-"}
            </p>
            <p>
              <strong>{t("missions.card.batteryReq")}:</strong>{" "}
              {m.minBattery}%
            </p>
            <div className="mission-card-actions">
              <button
                onClick={() => onEditMission(m)}
                className="btn-edit-mission"
              >
                {t("users.edit", "Editar")}
              </button>
              <button
                onClick={() => onDeleteClick(m.id)}
                className="btn-delete flex-fill"
              >
                {t("missions.card.deleteBtn")}
              </button>
            </div>
          </div>
        ))}
        {missions.length === 0 && <p>{t("missions.noMissions")}</p>}
      </div>
    </section>
  );
}

MissionListSection.propTypes = {
  missions: PropTypes.array.isRequired,
  onEditMission: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
};
