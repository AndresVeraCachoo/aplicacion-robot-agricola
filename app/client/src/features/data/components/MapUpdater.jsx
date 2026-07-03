// src/features/data/components/MapUpdater.jsx
import { useEffect } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";

/**
 * Componente utilitario para Leaflet que actualiza el centro del mapa 
 * dinámicamente cuando cambian las coordenadas.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {number[]} props.center - Array con latitud y longitud [lat, lng].
 * @returns {null} Este componente no renderiza nada visible.
 */
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 17, { duration: 1.5 });
    }
  }, [center, map]);
  
  return null;
}

MapUpdater.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default MapUpdater;
