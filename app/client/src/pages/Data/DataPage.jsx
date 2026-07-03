// src/pages/DataPage.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../../store/robotStore";
import { useMissionStore } from "../../store/missionStore";
import { useToastStore } from "../../store/toastStore";
import ChartWidget from "../../features/dashboard/components/ChartWidget";
import { DateRangePicker } from "../../components/DateRangePicker";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./DataPage.css";
import { robotService } from "../../services/robotService";
import {
  groupSessions,
  calculateStats,
  calculateAverage,
  exportToCSV,
  exportToPDF,
  getMapCenterAndPolygon,
} from "../../features/data/utils/dataExport";

import DataTable from "../../features/data/components/DataTable";
import MissionList from "../../features/data/components/MissionList";
import MissionDetailMap from "../../features/data/components/MissionDetailMap";
import MapUpdater from "../../features/data/components/MapUpdater";

const API_URL = "/data";

/**
 * DataPage Component
 * 
 * Componente principal de la página de datos agronómicos.
 * Permite visualizar el historial de datos mediante tablas y gráficos, además de misiones individuales en el mapa.
 * 
 * @returns {JSX.Element}
 */
const DataPage = () => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const itemsPerPage = 10;

  const [filteredData, setFilteredData] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const liveAgronomicData = useRobotStore((state) =>
    Array.isArray(state.agronomicData) ? state.agronomicData : [],
  );
  const deleteSessionData = useRobotStore((state) => state.deleteSessionData);
  const { missions, fetchMissions } = useMissionStore();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const displayDataRaw =
    filteredData === null ? liveAgronomicData : filteredData;
    
  const displayData = [...displayDataRaw].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  
  const totalPages = Math.ceil(displayData.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);
  
  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleFilter = async (start, end, misionId) => {
    if (!start && !end && !misionId) {
      setFilteredData(null);
      return;
    }
    setIsFiltering(true);
    try {
      const params = new URLSearchParams();
      if (start && end) {
        params.append("start", start);
        params.append("end", end);
      }
      if (misionId) {
        params.append("misionId", misionId);
      }

      const responseData = await robotService.getAgronomicData(start, end, misionId);
      setFilteredData(responseData);
      setCurrentPage(1);
      addToast(t("data.recordsFound", { count: responseData.length }), "info");
    } catch {
      addToast(t("data.fetchError"), "error");
    } finally {
      setIsFiltering(false);
    }
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const num = Number(jumpPage);
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      setJumpPage("");
    }
  };

  const executedSessions = groupSessions(displayData, missions, t);
  const selectedSession =
    executedSessions.find((s) => s.id === selectedSessionId) || null;
  const filteredMissionData = selectedSession ? selectedSession.dataPoints : [];
  const { polygonCoords, mapCenter } = getMapCenterAndPolygon(
    selectedSession,
    filteredMissionData,
  );
  const { durationStr, batteryEst } = calculateStats(filteredMissionData);
  const avgHumidity = calculateAverage(filteredMissionData, "humidity");
  const avgTemp = calculateAverage(filteredMissionData, "soilTemperature");
  const avgPh = calculateAverage(filteredMissionData, "ph");

  return (
    <div className="data-page-container">
      <DateRangePicker onFilter={handleFilter} missions={missions} />

      {isFiltering ? (
        <div className="data-loading-indicator">
          <h3>{t("data.waitingData")} ⏳</h3>
        </div>
      ) : (
        <>
          {displayData.length > 0 && (
            <div className="chart-section">
              <ChartWidget
                data={displayData}
                title={t("data.individualAnalysis")}
                initialType="line"
                initialMetric1="nitrogen"
              />
            </div>
          )}

          {displayData.length > 0 && (
            <div className="chart-section">
              <ChartWidget
                data={displayData}
                title={t("data.comparativeAnalysis")}
                initialType="compare"
                initialMetric1="temperature"
                initialMetric2="humidity"
                forcedCompare={true}
              />
            </div>
          )}

          <DataTable 
            displayData={displayData}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            jumpPage={jumpPage}
            setJumpPage={setJumpPage}
            handleJumpToPage={handleJumpToPage}
            filteredData={filteredData}
            t={t}
            i18n={i18n}
          />

          <div className="mission-analysis-widget">
          <MissionList 
            executedSessions={executedSessions}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
            deleteSessionData={deleteSessionData}
            selectedSession={selectedSession}
            t={t}
            i18n={i18n}
          />

            <MissionDetailMap
              selectedSession={selectedSession}
              filteredMissionData={filteredMissionData}
              polygonCoords={polygonCoords}
              mapCenter={mapCenter}
              durationStr={durationStr}
              batteryEst={batteryEst}
              avgHumidity={avgHumidity}
              avgTemp={avgTemp}
              avgPh={avgPh}
              exportToCSV={exportToCSV}
              exportToPDF={exportToPDF}
              addToast={addToast}
              t={t}
              i18n={i18n}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default DataPage;