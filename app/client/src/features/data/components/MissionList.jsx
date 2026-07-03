import React from "react";
import PropTypes from "prop-types";

/**
 * Component to list mission execution sessions.
 */
const MissionList = ({ 
  executedSessions, 
  selectedSessionId, 
  setSelectedSessionId, 
  deleteSessionData, 
  selectedSession, 
  t, 
  i18n 
}) => (
  <div className="mission-list-col">
    <div className="mission-list-header">
      <h3>{t("data.executionHistory")}</h3>
      <p>{t("data.sessionsPeriod")}</p>
    </div>
    <div className="mission-items">
      {executedSessions.length > 0 ? (
        executedSessions.map((s) => (
          <div key={s.id} className={`mission-item-wrapper ${selectedSession?.id === s.id ? "active" : ""}`}>
            <button className="mission-item-main" onClick={() => setSelectedSessionId(s.id)}>
              <h4>{s.name}</h4>
              <div className="mission-item-meta">
                <span>{new Date(s.endTime).toLocaleTimeString(i18n.language || "es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="points-badge">{s.dataPoints.length} {t("data.pts")}</span>
              </div>
            </button>
            <button
              className="btn-delete-session"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteSessionData(s.id);
                if (selectedSessionId === s.id) setSelectedSessionId(null);
              }}
            >
              🗑️
            </button>
          </div>
        ))
      ) : (
        <p className="no-missions-text">{t("data.noMissionsFilter")}</p>
      )}
    </div>
  </div>
);

MissionList.propTypes = {
  executedSessions: PropTypes.array.isRequired,
  selectedSessionId: PropTypes.string,
  setSelectedSessionId: PropTypes.func.isRequired,
  deleteSessionData: PropTypes.func.isRequired,
  selectedSession: PropTypes.object,
  t: PropTypes.func.isRequired,
  i18n: PropTypes.object.isRequired,
};

export default MissionList;
