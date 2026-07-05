import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export function MissionFormPanel({ formState, formSetters, formHandlers }) {
  const { t } = useTranslation();
  const { editingId, name, sensors, workingWidth, passAngle, minBattery } = formState;
  const { setName, setWorkingWidth, setPassAngle, setMinBattery } = formSetters;
  const { handleCheckboxChange, handleSaveMission, handleCancelEdit } = formHandlers;

  return (
    <aside className="mission-form-panel">
      <div className="mission-form-card">
        <h3>
          {editingId
            ? t("missions.editTitle", "Editar Misión")
            : t("missions.createNew")}
        </h3>

        <form onSubmit={handleSaveMission}>
          <div className="form-group">
            <label htmlFor="mission-name">{t("missions.form.name")}</label>
            <input
              id="mission-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <span className="mission-form-subtitle">
              {t("missions.form.dataToCollect")}
            </span>
            <div className="sensors-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sensors.humidity}
                  onChange={() => handleCheckboxChange("humidity")}
                />
                {t("missions.form.humidity")}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sensors.temperature}
                  onChange={() => handleCheckboxChange("temperature")}
                />
                {t("missions.form.soilTemp")}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sensors.ph}
                  onChange={() => handleCheckboxChange("ph")}
                />
                {t("missions.form.ph")}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sensors.npk}
                  onChange={() => handleCheckboxChange("npk")}
                />
                {t("missions.form.npk")}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sensors.radiation}
                  onChange={() => handleCheckboxChange("radiation")}
                />
                {t("missions.form.solarRad")}
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mission-width">
                {t("missions.form.Width")} (m)
              </label>
              <input
                id="mission-width"
                type="number"
                min="0.5"
                max="10"
                step="0.1"
                value={workingWidth}
                onChange={(e) => setWorkingWidth(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="mission-angle">
                {t("missions.form.angle")} (º)
              </label>
              <input
                id="mission-angle"
                type="number"
                min="0"
                max="180"
                value={passAngle}
                onChange={(e) => setPassAngle(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="mission-battery">
                {t("missions.form.minBattery")} (%)
              </label>
              <input
                id="mission-battery"
                type="number"
                min="10"
                max="50"
                value={minBattery}
                onChange={(e) => setMinBattery(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-actions-row">
            {editingId && (
              <button
                type="button"
                className="btn-cancel-mission"
                onClick={handleCancelEdit}
              >
                {t("users.cancel", "Cancelar")}
              </button>
            )}
            <button type="submit" className="btn-save-mission" style={{ width: "100%" }}>
              {editingId
                ? t("users.save", "Guardar")
                : t("missions.form.saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

MissionFormPanel.propTypes = {
  formState: PropTypes.object.isRequired,
  formSetters: PropTypes.object.isRequired,
  formHandlers: PropTypes.object.isRequired,
};
