// src/features/dashboard/components/FieldDataOverlay.jsx
import { useEffect } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat"; // Extensión mágica para el mapa de calor
import { useRobotStore } from "../../../store/robotStore";

/**
 * Componente que renderiza una capa de mapa de calor con los datos agronómicos.
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.metric - Métrica a visualizar (humidity, ph, temperature).
 * @returns {null} Este componente no renderiza elementos DOM.
 */
const FieldDataOverlay = ({ metric }) => {
  const map = useMap();
  const { agronomicData } = useRobotStore();

  useEffect(() => {
    // Si no hay datos o la capa está apagada, no hacemos nada
    if (!agronomicData || agronomicData.length === 0 || metric === "none")
      return;

    // Extraer los puntos y calcular la intensidad (0.0 a 1.0)
    const heatPoints = agronomicData
      .filter((d) => d.lat && d.lon && d[metric] != null)
      .map((d) => {
        const val = Number(d[metric]);
        let intensity = 0;

        if (metric === "humidity") {
          intensity = val / 100; // Humedad va de 0% a 100%
        } else if (metric === "ph") {
          intensity = Math.max(0, Math.min(1, (val - 5) / 3)); // Normaliza pH de 5 a 8
        } else if (metric === "temperature") {
          intensity = Math.max(0, Math.min(1, (val - 10) / 30)); // Normaliza Temp de 10C a 40C
        }

        // Formato que pide leaflet.heat: [lat, lng, intensidad]
        return [Number(d.lat), Number(d.lon), intensity];
      });

    if (heatPoints.length === 0) return;

    // Definir los colores
    // Empezamos en 0.0 para que el azul cubra más rápido los valores bajos
    const unifiedGradient = { 0: "blue", 0.5: "yellow", 1: "red" };

    // Pintar la capa en el mapa
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 45,
      maxZoom: 19,
      max: 1,
      minOpacity: 0.4,
      gradient: unifiedGradient,
    });

    heatLayer.addTo(map);

    // Limpiar el mapa cuando cambiemos de métrica en el desplegable
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
