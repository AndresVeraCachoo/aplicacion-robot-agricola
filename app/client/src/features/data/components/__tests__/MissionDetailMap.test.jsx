import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MissionDetailMap from '../MissionDetailMap';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polygon: () => <div data-testid="polygon" />,
  CircleMarker: () => <div data-testid="circle-marker" />,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('../MapUpdater', () => ({
  default: () => <div data-testid="map-updater" />
}));

describe('MissionDetailMap Component', () => {
  const defaultProps = {
    selectedSession: { id: 1, name: 'Mision A' },
    filteredMissionData: [
      { id: 1, lat: 40, lon: -3, humidity: 50, soilTemperature: 20, ph: 7 }
    ],
    polygonCoords: [[40, -3], [41, -3]],
    mapCenter: [40.5, -3],
    durationStr: '10m 0s',
    batteryEst: '5%',
    avgHumidity: 50,
    avgTemp: 20,
    avgPh: 7,
    exportToCSV: vi.fn(),
    exportToPDF: vi.fn(),
    emailCSV: vi.fn(),
    emailPDF: vi.fn(),
    addToast: vi.fn(),
    t: vi.fn(key => key),
    i18n: { language: 'es-ES' }
  };

  it('debe renderizar estado vacío cuando no hay sesión seleccionada', () => {
    render(<MissionDetailMap {...defaultProps} selectedSession={null} />);
    expect(screen.getByText('data.noSelection')).toBeInTheDocument();
  });

  it('debe renderizar detalles de la sesión y el mapa', () => {
    render(<MissionDetailMap {...defaultProps} />);
    expect(screen.getByText(/Mision A/)).toBeInTheDocument();
    expect(screen.getByText(/10m 0s/)).toBeInTheDocument();
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    expect(screen.getByText(/50.0%/)).toBeInTheDocument();
    expect(screen.getByText(/20.0°C/)).toBeInTheDocument();
    expect(screen.getByText(/7.0/)).toBeInTheDocument();
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('polygon')).toBeInTheDocument();
    expect(screen.getByTestId('circle-marker')).toBeInTheDocument();
  });

  it('debe llamar a exportToCSV al pulsar el botón', () => {
    render(<MissionDetailMap {...defaultProps} />);
    
    const csvToggle = screen.getByText(/CSV ▾/i);
    fireEvent.click(csvToggle);
    
    const csvBtn = screen.getByText(/data.exportCsv/i);
    fireEvent.click(csvBtn);
    
    expect(defaultProps.exportToCSV).toHaveBeenCalled();
  });

  it('debe llamar a exportToPDF al pulsar el botón', () => {
    render(<MissionDetailMap {...defaultProps} />);
    
    const pdfToggle = screen.getByText(/PDF ▾/i);
    fireEvent.click(pdfToggle);
    
    const pdfBtn = screen.getByText(/data.exportPdf/i);
    fireEvent.click(pdfBtn);
    
    expect(defaultProps.exportToPDF).toHaveBeenCalled();
  });
});