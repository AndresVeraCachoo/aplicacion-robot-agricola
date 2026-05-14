import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FieldDataOverlay from '../FieldDataOverlay.jsx';
import { useRobotStore } from '../../../../store/robotStore';

// Mocks
vi.mock('../../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

const mockRemoveLayer = vi.fn();
const mockAddTo = vi.fn();
const mockHeatLayer = vi.fn(() => ({ addTo: mockAddTo }));

vi.mock('react-leaflet', () => ({
  useMap: () => ({ removeLayer: mockRemoveLayer }),
}));

vi.mock('leaflet', () => ({
  default: { heatLayer: (...args) => mockHeatLayer(...args) },
}));

// Mock plugin de extensión vacío
vi.mock('leaflet.heat', () => ({}));

describe('FieldDataOverlay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no hace nada si la métrica es "none" o no hay datos', () => {
    useRobotStore.mockReturnValue({ agronomicData: [] });
    render(<FieldDataOverlay metric="none" />);
    expect(mockHeatLayer).not.toHaveBeenCalled();

    useRobotStore.mockReturnValue({ agronomicData: null });
    render(<FieldDataOverlay metric="humedad" />);
    expect(mockHeatLayer).not.toHaveBeenCalled();
  });

  it('calcula intensidades y añade la capa de humedad (humedad / 100)', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [
        { lat: 40, lon: -3, humedad: 80 },
        { lat: 40.1, lon: -3.1, humedad: 50 }
      ]
    });
    
    render(<FieldDataOverlay metric="humedad" />);
    
    // Verificamos que se calculó [lat, lon, intensidad]
    expect(mockHeatLayer).toHaveBeenCalledWith(
      [
        [40, -3, 0.8], // 80 / 100
        [40.1, -3.1, 0.5] // 50 / 100
      ],
      expect.any(Object)
    );
    expect(mockAddTo).toHaveBeenCalled();
  });

  it('calcula intensidades y añade la capa de pH (normalizado 5-8)', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [
        { lat: 40, lon: -3, ph: 4 }, // Menos de 5 => intensidad 0
        { lat: 40.1, lon: -3.1, ph: 6.5 }, // Centro => intensidad 0.5
        { lat: 40.2, lon: -3.2, ph: 9 } // Mayor de 8 => intensidad 1
      ]
    });
    
    render(<FieldDataOverlay metric="ph" />);
    
    expect(mockHeatLayer).toHaveBeenCalledWith(
      [
        [40, -3, 0],
        [40.1, -3.1, 0.5],
        [40.2, -3.2, 1]
      ],
      expect.any(Object)
    );
  });

  it('calcula intensidades y añade la capa de temperatura_suelo (normalizado 10-40C)', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [
        { lat: 40, lon: -3, temperatura_suelo: 5 }, // Intensidad 0
        { lat: 40.1, lon: -3.1, temperatura_suelo: 25 }, // Intensidad 0.5
        { lat: 40.2, lon: -3.2, temperatura_suelo: 50 } // Intensidad 1
      ]
    });
    
    render(<FieldDataOverlay metric="temperatura_suelo" />);
    
    expect(mockHeatLayer).toHaveBeenCalledWith(
      [
        [40, -3, 0],
        [40.1, -3.1, 0.5],
        [40.2, -3.2, 1]
      ],
      expect.any(Object)
    );
  });

  it('limpia la capa del mapa (removeLayer) cuando el componente se desmonta o la métrica cambia', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [{ lat: 40, lon: -3, humedad: 50 }]
    });
    
    const { unmount } = render(<FieldDataOverlay metric="humedad" />);
    unmount();

    expect(mockRemoveLayer).toHaveBeenCalled();
  });
});