// src/hooks/useEnergyData.js
import { useQuery } from "@tanstack/react-query";
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
  const isFilteringActive = !!(dateFilter.start || dateFilter.misionId);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["energy", dateFilter.start, dateFilter.end, dateFilter.misionId],
    queryFn: () => robotService.getEnergy(dateFilter.start, dateFilter.end, dateFilter.misionId),
    refetchInterval: isFilteringActive ? false : 15000,
    select: (responseData) => {
      // 🛡️ Prevenimos que datos nulos rompan la gráfica (NaN)
      let mappedData = responseData.map((item) => ({
        timeMs: new Date(item.timestamp).getTime(),
        batteryLevel: Number(item.batteryPercentage) || 0,
        solarWatts: Number(item.solarRadiation) || 0,
        temperature: Number(item.temperature) || 0,
      }));

      // Aseguramos orden cronológico para evitar cruces en la línea
      mappedData.sort((a, b) => a.timeMs - b.timeMs);

      // Si no hay filtro, mostramos solo las últimas 24h
      if (!isFilteringActive) {
        const now = Date.now();
        mappedData = mappedData.filter((d) => now - d.timeMs <= 24 * 3600 * 1000);
      }

      const currentSolarInput = mappedData.length > 0 
        ? Number(mappedData[mappedData.length - 1].solarWatts).toFixed(0) 
        : 0;

      return { chartData: mappedData, currentSolarInput };
    },
  });

  return { 
    chartData: data?.chartData || [], 
    currentSolarInput: data?.currentSolarInput || 0, 
    isFiltering: isFetching, 
    fetchEnergyHistory: refetch 
  };
}
