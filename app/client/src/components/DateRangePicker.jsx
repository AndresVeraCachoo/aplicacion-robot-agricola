// src/components/DateRangePicker.jsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { es, enUS } from "date-fns/locale"; // 👈 Importamos inglés y español
import { useTranslation } from "react-i18next"; // 👈 Importamos el traductor
import PropTypes from "prop-types";
import "react-datepicker/dist/react-datepicker.css";
import "./DateRangePicker.css";

export const DateRangePicker = ({ onFilter, misiones }) => {
  const { t, i18n } = useTranslation(); // 👈 Instanciamos el hook
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [misionId, setMisionId] = useState("");

  // Elegimos el idioma del calendario nativo basándonos en i18n
  const currentLocale = i18n.language.startsWith("en") ? enUS : es;

  const handleApply = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert("Por favor, selecciona tanto la fecha de inicio como la de fin.");
      return;
    }

    onFilter(
      startDate ? startDate.toISOString() : null,
      endDate ? endDate.toISOString() : null,
      misionId === "" ? null : misionId,
    );
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setMisionId("");
    onFilter(null, null, null);
  };

  return (
    <div className="filter-bar-container">
      <div className="filter-group">
        <label htmlFor="filter-mision">{t("data.filterMission")}</label>
        <select
          id="filter-mision"
          value={misionId}
          onChange={(e) => setMisionId(e.target.value)}
          className="custom-datepicker-input select-mision"
        >
          <option value="">{t("data.allMissions")}</option>
          {misiones?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-start-date">{t("data.filterFrom")}</label>
        <DatePicker
          id="filter-start-date"
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          showTimeInput
          timeInputLabel={t("data.filterTime")}
          dateFormat="dd/MM/yyyy HH:mm"
          locale={currentLocale} // 👈 Idioma dinámico
          placeholderText={t("data.filterStartPlaceholder")}
          portalId="root-portal"
          className="custom-datepicker-input"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-end-date">{t("data.filterTo")}</label>
        <DatePicker
          id="filter-end-date"
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          showTimeInput
          timeInputLabel={t("data.filterTime")}
          dateFormat="dd/MM/yyyy HH:mm"
          locale={currentLocale} // 👈 Idioma dinámico
          placeholderText={t("data.filterEndPlaceholder")}
          minDate={startDate}
          portalId="root-portal"
          className="custom-datepicker-input"
        />
      </div>

      <div className="filter-actions">
        <button onClick={handleApply} className="btn-filter-apply">
          {t("data.filterApply")}
        </button>
        <button onClick={handleClear} className="btn-filter-clear">
          {t("data.filterClear")}
        </button>
      </div>
    </div>
  );
};

DateRangePicker.propTypes = {
  onFilter: PropTypes.func.isRequired,
  misiones: PropTypes.array,
};
