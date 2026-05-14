import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../Dashboard.jsx';

// Mock del componente hijo (MapView) para aislar la prueba unitaria del Dashboard
// Esto evita cargar Leaflet o lógicas complejas no pertinentes a esta capa
vi.mock('../components/MapView', () => ({
  default: () => <div data-testid="mock-map-view">MapView Component</div>
}));

describe('Dashboard Component', () => {
  it('renderiza la estructura principal y monta el componente MapView', () => {
    render(<Dashboard />);
    
    // Verificamos el contenedor principal
    const pageContainer = document.querySelector('.dashboard-page-container');
    expect(pageContainer).toBeInTheDocument();
    
    // Verificamos el contenedor del widget (CSS estructural)
    const widgetWrapper = document.querySelector('.map-widget-wrapper');
    expect(widgetWrapper).toBeInTheDocument();

    // Verificamos que el componente MapView hijo se ha inyectado correctamente en el DOM
    const mapMock = screen.getByTestId('mock-map-view');
    expect(mapMock).toBeInTheDocument();
    expect(mapMock).toHaveTextContent('MapView Component');
  });
});