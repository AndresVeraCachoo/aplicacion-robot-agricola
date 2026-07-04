// src/pages/Energy/EnergyPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { es, enUS } from "date-fns/locale";
import { useRobotStore } from "../../store/robotStore";
import { useMissions } from "../../hooks/useMissions";
import { DateRangePicker } from "../../components/DateRangePicker";
import EnergyKPIs from "../../features/energy/components/EnergyKPIs";
import EnergyChart from "../../features/energy/components/EnergyChart";
import { useEnergyData } from "../../hooks/useEnergyData";
import "./EnergyPage.css";

/**
 * Componente principal de la página de energía.
 * Muestra el historial y estado actual de la batería, carga solar y consumos del robot en tiempo real.
 * Funciona como orquestador usando useEnergyData, EnergyKPIs y EnergyChart.
 * 
 * @returns {JSX.Element} El componente de la página de energía.
 */
function EnergyPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Estado real del Store (WebSockets)
  const battery = useRobotStore((state) => state.battery);
  const isCharging = battery?.status === "CHARGING";

  // Obtenemos las misiones para rellenar el desplegable
  const { missions } = useMissions();

  const [dateFilter, setDateFilter] = useState({
    start: null,
    end: null,
    misionId: null,
  });

  const { chartData, currentSolarInput, isFiltering } = useEnergyData(dateFilter);


  const handleFilter = (start, end, misionId) => {
    setDateFilter({ start, end, misionId });
  };

  // Adapta el idioma de las fechas en la gráfica
  const currentLocale = i18n.language.startsWith("en") ? enUS : es;
  const currentAmps = (
    battery?.voltage > 0 ? 120 / battery.voltage : 0
  ).toFixed(1);

  return (
    <div className="energy-page-container">
      <header className="energy-header">
        <button
          onClick={() => navigate("/app/dashboard")}
          className="btn-back"
          title={t("dashboard.title")}
        >
          ←
        </button>
        <h1>{t("energy.title", "Gestión de Energía")}</h1>
      </header>

      <EnergyKPIs 
        battery={battery}
        isCharging={isCharging}
        currentSolarInput={currentSolarInput}
        currentAmps={currentAmps}
        t={t}
      />

      <div className="energy-charts-section">
        <div className="charts-section-header">
          <h3 className="section-title">
            {dateFilter.start || dateFilter.misionId
              ? t("energy.balance", "Balance Energético")
              : t("energy.balance24h", "Balance Energético (24h)")}
          </h3>
          <DateRangePicker onFilter={handleFilter} missions={missions} />
        </div>

        {isFiltering ? (
          <div className="energy-loading">
            {t("energy.fetchingData", "Buscando telemetría... ⏳")}
          </div>
        ) : (
          <EnergyChart 
            chartData={chartData}
            currentLocale={currentLocale}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

export default EnergyPage;

