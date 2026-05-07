// src/components/DateRangePicker.jsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { es, enUS } from "date-fns/locale"; 
import { useTranslation } from "react-i18next"; 
import PropTypes from "prop-types";
import "react-datepicker/dist/react-datepicker.css";
import "./DateRangePicker.css";

export const DateRangePicker = ({ onFilter, misiones }) => {
  const { t, i18n } = useTranslation(); 
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [misionId, setMisionId] = useState("");

  const currentLocale = i18n.language.startsWith("en") ? enUS : es;

  const handleApply = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert(t("data.dateError", "Por favor, selecciona tanto la fecha de inicio como la de fin."));
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
        {/* CORRECCIÓN: Etiqueta actualizada */}
        <label htmlFor="filter-mision">{t("data.dataSource", "DATOS:")}</label>
        <select
          id="filter-mision"
          value={misionId}
          onChange={(e) => setMisionId(e.target.value)}
          className="custom-datepicker-input select-mision"
        >
          {/* Opción base que engloba manuales y automatizados */}
          <option value="">{t("data.allData", "Todos los datos")}</option>
          {misiones?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-start-date">{t("data.filterFrom", "Desde:")}</label>
        <DatePicker
          id="filter-start-date"
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          showTimeInput
          timeInputLabel={t("data.filterTime", "Hora:")}
          dateFormat="dd/MM/yyyy HH:mm"
          locale={currentLocale} 
          placeholderText={t("data.filterStartPlaceholder", "Inicio...")}
          portalId="root-portal"
          className="custom-datepicker-input"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-end-date">{t("data.filterTo", "Hasta:")}</label>
        <DatePicker
          id="filter-end-date"
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          showTimeInput
          timeInputLabel={t("data.filterTime", "Hora:")}
          dateFormat="dd/MM/yyyy HH:mm"
          locale={currentLocale} 
          placeholderText={t("data.filterEndPlaceholder", "Fin...")}
          minDate={startDate}
          portalId="root-portal"
          className="custom-datepicker-input"
        />
      </div>

      <div className="filter-actions">
        <button onClick={handleApply} className="btn-filter-apply">
          {t("data.filterApply", "Aplicar")}
        </button>
        <button onClick={handleClear} className="btn-filter-clear">
          {t("data.filterClear", "Limpiar")}
        </button>
      </div>
    </div>
  );
};

DateRangePicker.propTypes = {
  onFilter: PropTypes.func.isRequired,
  misiones: PropTypes.array,
};