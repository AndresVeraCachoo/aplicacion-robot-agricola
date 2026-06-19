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

describe('Componente FieldDataOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no hace nada si la métrica es ninguna o no hay datos', () => {
    useRobotStore.mockReturnValue({ agronomicData: [] });
    render(<FieldDataOverlay metric="none" />);
    expect(mockHeatLayer).not.toHaveBeenCalled();

    useRobotStore.mockReturnValue({ agronomicData: null });
    render(<FieldDataOverlay metric="humidity" />);
    expect(mockHeatLayer).not.toHaveBeenCalled();
  });

  it('calcula intensidades y añade capa de humedad', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [
        { lat: 40, lon: -3, humidity: 80 },
        { lat: 40.1, lon: -3.1, humidity: 50 }
      ]
    });
    
    render(<FieldDataOverlay metric="humidity" />);
    
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

  it('calcula intensidades y añade capa de pH', () => {
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

  it('calcula intensidades y añade capa de temperatura', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [
        { lat: 40, lon: -3, temperature: 5 }, // Intensidad 0
        { lat: 40.1, lon: -3.1, temperature: 25 }, // Intensidad 0.5
        { lat: 40.2, lon: -3.2, temperature: 50 } // Intensidad 1
      ]
    });
    
    render(<FieldDataOverlay metric="temperature" />);
    
    expect(mockHeatLayer).toHaveBeenCalledWith(
      [
        [40, -3, 0],
        [40.1, -3.1, 0.5],
        [40.2, -3.2, 1]
      ],
      expect.any(Object)
    );
  });

  it('limpia capa de mapa al desmontar componente o cambiar métrica', () => {
    useRobotStore.mockReturnValue({
      agronomicData: [{ lat: 40, lon: -3, humidity: 50 }]
    });
    
    const { unmount } = render(<FieldDataOverlay metric="humidity" />);
    unmount();

    expect(mockRemoveLayer).toHaveBeenCalled();
  });
});
