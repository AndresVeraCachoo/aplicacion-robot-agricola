import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRobotStore } from "../../store/robotStore";
import { useMissions } from "../../hooks/useMissions";
import { useToastStore } from "../../store/toastStore";
import ChartWidget from "../../features/dashboard/components/ChartWidget";
import { DateRangePicker } from "../../components/DateRangePicker";


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

  const [filters, setFilters] = useState(null);

  const { data: filteredData = null, isFetching: isFiltering, isError } = useQuery({
    queryKey: ["agronomicData", filters],
    queryFn: () => robotService.getAgronomicData(filters.start, filters.end, filters.misionId),
    enabled: !!filters,
  });

  const wasFiltering = React.useRef(false);
  useEffect(() => {
    if (isFiltering) {
      wasFiltering.current = true;
    } else if (wasFiltering.current) {
      wasFiltering.current = false;
      if (filters) {
        if (isError) {
          addToast("data.fetchError", "error");
        } else {
          addToast("data.recordsFound", "info");
        }
      }
    }
  }, [isFiltering, isError, filters, addToast]);

  const liveAgronomicData = useRobotStore((state) =>
    Array.isArray(state.agronomicData) ? state.agronomicData : [],
  );
  const deleteSessionData = useRobotStore((state) => state.deleteSessionData);
  const { missions, fetchMissions } = useMissions();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const displayDataRaw = filters ? (filteredData || []) : liveAgronomicData;
    
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

  const handleFilter = (start, end, misionId) => {
    if (!start && !end && !misionId) {
      setFilters(null);
    } else {
      setFilters({ start, end, misionId });
      setCurrentPage(1);
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