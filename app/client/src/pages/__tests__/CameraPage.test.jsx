import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CameraPage from '../CameraPage.jsx';

// Mockeamos las traducciones
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

// Mockeamos el componente pesado MapView para no cargar Leaflet de nuevo
vi.mock('../../features/dashboard/components/MapView', () => ({
  default: () => <div data-testid="mock-mapview">Mocked MapView</div>,
}));

describe('Componente CameraPage', () => {
  it('renderiza la vista de cámara inmersiva y minimapa', () => {
    render(<CameraPage />);

    // Comprobamos el contenedor principal de la página
    const mainContainer = document.querySelector('.camera-page-immersive');
    expect(mainContainer).toBeInTheDocument();

    // Comprobamos el feed de la cámara (buscando la clase y el texto traducido)
    const cameraLens = document.querySelector('.camera-lens-large');
    expect(cameraLens).toBeInTheDocument();
    
    // Verificamos que se renderiza el texto (clave del t() mockeado)
    expect(screen.getByText('camera.feed')).toBeInTheDocument();

    // Verificamos que el punto de grabación (recording dot) está presente
    const recDot = document.querySelector('.camera-rec-dot-large');
    expect(recDot).toBeInTheDocument();

    // Verificamos que el contenedor del minimapa y el componente MapView se montan
    const minimapContainer = document.querySelector('.minimap-container');
    expect(minimapContainer).toBeInTheDocument();
    expect(screen.getByTestId('mock-mapview')).toBeInTheDocument();
  });
});
