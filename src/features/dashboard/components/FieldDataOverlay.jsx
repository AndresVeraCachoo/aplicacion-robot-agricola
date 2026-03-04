// src/features/dashboard/components/FieldDataOverlay.jsx
import { useEffect } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat"; // Extensión mágica para el mapa de calor
import { useRobotStore } from "../../../store/robotStore";

const FieldDataOverlay = ({ metric }) => {
  const map = useMap();
  const { agronomicData } = useRobotStore();

  useEffect(() => {
    // Si no hay datos o la capa está apagada, no hacemos nada
    if (!agronomicData || agronomicData.length === 0 || metric === "none")
      return;

    // 1. Extraer los puntos y calcular la intensidad (0.0 a 1.0)
    const heatPoints = agronomicData
      .filter((d) => d.lat && d.lon && d[metric] != null)
      .map((d) => {
        const val = Number(d[metric]);
        let intensity = 0;

        if (metric === "humedad") {
          intensity = val / 100; // Humedad va de 0% a 100%
        } else if (metric === "ph") {
          intensity = Math.max(0, Math.min(1, (val - 5) / 3)); // Normaliza pH de 5 a 8
        } else if (metric === "temperatura_suelo") {
          intensity = Math.max(0, Math.min(1, (val - 10) / 30)); // Normaliza Temp de 10C a 40C
        }

        // Formato que pide leaflet.heat: [lat, lng, intensidad]
        return [Number(d.lat), Number(d.lon), intensity];
      });

    if (heatPoints.length === 0) return;

    // 2. Definir los colores
    // Empezamos en 0.0 para que el azul cubra más rápido los valores bajos
    const unifiedGradient = { 0: "blue", 0.5: "yellow", 1: "red" };

    // 3. Pintar la capa en el mapa
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 45,
      maxZoom: 19,
      max: 1,
      minOpacity: 0.4, // <-- NUEVO: Fuerza a que los valores bajos (azul) nunca sean invisibles
      gradient: unifiedGradient,
    });

    heatLayer.addTo(map);

    // 4. Limpiar el mapa cuando cambiemos de métrica en el desplegable
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, agronomicData, metric]);

  // Este componente no devuelve HTML, solo dibuja directamente en el Canvas del mapa
  return null;
};

// 2. Definición del tipo de propiedad esperada
FieldDataOverlay.propTypes = {
  metric: PropTypes.string.isRequired,
};

export default FieldDataOverlay;
