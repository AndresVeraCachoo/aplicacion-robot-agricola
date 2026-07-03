// src/hooks/useEnergyData.js
import { useState, useCallback, useEffect } from "react";
import { robotService } from "../services/robotService";

/**
 * Hook personalizado para gestionar los datos históricos de energía.
 * Se encarga de hacer el fetch a la API con los filtros y mantener el estado
 * para los gráficos y KPI superiores.
 * 
 * @param {Object} dateFilter - Filtro de fechas y misión.
 * @param {string} dateFilter.start - Fecha de inicio.
 * @param {string} dateFilter.end - Fecha de fin.
 * @param {string} dateFilter.misionId - ID de la misión a filtrar.
 * @returns {Object} Objeto con chartData, currentSolarInput, isFiltering y la función fetchEnergyHistory.
 */
export function useEnergyData(dateFilter) {
  const [chartData, setChartData] = useState([]);
  const [currentSolarInput, setCurrentSolarInput] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);

  const fetchEnergyHistory = useCallback(async () => {
    try {
      const responseData = await robotService.getEnergy(
        dateFilter.start,
        dateFilter.end,
        dateFilter.misionId
      );

      // 🛡️ Prevenimos que datos nulos rompan la gráfica (NaN)
      const mappedData = responseData.map((item) => ({
        timeMs: new Date(item.timestamp).getTime(),
        batteryLevel: Number(item.batteryPercentage) || 0,
        solarWatts: Number(item.solarRadiation) || 0,
        temperature: Number(item.temperature) || 0,
      }));

      // Aseguramos orden cronológico para evitar cruces en la línea
      mappedData.sort((a, b) => a.timeMs - b.timeMs);

      // Si no hay filtro, mostramos solo las últimas 24h
      if (!dateFilter.start && !dateFilter.misionId) {
        const now = new Date();
        setChartData(
          mappedData.filter((d) => now - d.timeMs <= 24 * 3600 * 1000)
        );
      } else {
        setChartData(mappedData);
      }

      if (mappedData.length > 0) {
        setCurrentSolarInput(
          Number(mappedData[mappedData.length - 1].solarWatts).toFixed(0)
        );
      } else {
        setCurrentSolarInput(0);
      }
    } catch {
      // Failed to load energy history
    } finally {
      setIsFiltering(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    setIsFiltering(true);
    fetchEnergyHistory();
    // Auto-refresco de 15s solo si NO hay filtros activos
    if (!dateFilter.start && !dateFilter.misionId) {
      const interval = setInterval(fetchEnergyHistory, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchEnergyHistory, dateFilter.start, dateFilter.misionId]);

  return { chartData, currentSolarInput, isFiltering, fetchEnergyHistory };
}
