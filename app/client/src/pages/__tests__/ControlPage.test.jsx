import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ControlPage from '../ControlPage.jsx';
import { useRobotStore } from '../../store/robotStore';

// 1. Mock de los componentes hijos pesados para aislar el test de la página
vi.mock('../../features/control/CameraFeed', () => ({
  default: () => <div data-testid="mock-camera-feed">Camera Feed</div>,
}));
vi.mock('../../features/control/ControlMap', () => ({
  default: ({ isPip }) => <div data-testid="mock-control-map" data-ispip={isPip}>Control Map</div>,
}));
vi.mock('../../features/control/ControlPanel', () => ({
  default: () => <div data-testid="mock-control-panel">Control Panel</div>,
}));

// 2. Mock del store
vi.mock('../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

describe('Componente ControlPage', () => {
  const mockSendManualMove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useRobotStore.mockReturnValue({
      system: { mode: 'MANUAL' },
      sendManualMove: mockSendManualMove,
    });
  });

  describe('Render Inicial y Picture-in-Picture (PiP)', () => {
    it('renderiza con mapa como vista principal y cámara como PiP', () => {
      render(<ControlPage />);
      
      const page = document.querySelector('.control-page');
      expect(page).toHaveClass('is-map-main');

      const cameraContainer = document.querySelector('.camera-container');
      expect(cameraContainer).toHaveClass('is-pip');
      
      const mapContainer = document.querySelector('.map-container');
      expect(mapContainer).toHaveClass('is-main');
    });

    it('intercambia vistas al hacer clic en contenedor PiP', () => {
      render(<ControlPage />);
      
      // Hacemos clic en la cámara (que empieza siendo PiP)
      const cameraContainer = document.querySelector('.camera-container');
      fireEvent.click(cameraContainer);

      // Ahora la cámara debe ser la vista principal
      const page = document.querySelector('.control-page');
      expect(page).toHaveClass('is-camera-main');
      expect(cameraContainer).toHaveClass('is-main');

      // Hacemos clic en el mapa (que ahora es PiP)
      const mapContainer = document.querySelector('.map-container');
      fireEvent.click(mapContainer);

      // Vuelve a su status original
      expect(page).toHaveClass('is-map-main');
    });

    it('intercambia vistas al presionar Enter o Espacio (Accesibilidad)', () => {
      render(<ControlPage />);
      const cameraContainer = document.querySelector('.camera-container');
      
      // Simular Enter
      fireEvent.keyDown(cameraContainer, { key: 'Enter' });
      expect(document.querySelector('.control-page')).toHaveClass('is-camera-main');

      const mapContainer = document.querySelector('.map-container');
      
      // Simular Espacio
      fireEvent.keyDown(mapContainer, { key: ' ' });
      expect(document.querySelector('.control-page')).toHaveClass('is-map-main');

      // Simular otra tecla no permitida (No debe hacer nada)
      fireEvent.keyDown(cameraContainer, { key: 'Escape' });
      expect(document.querySelector('.control-page')).toHaveClass('is-map-main'); // Sigue igual
    });
  });

  describe('Control por Joystick', () => {
    it('no renderiza el joystick si el modo NO ES MANUAL', () => {
      useRobotStore.mockReturnValue({ system: { mode: 'AUTO' }, sendManualMove: mockSendManualMove });
      render(<ControlPage />);
      
      expect(document.querySelector('.joystick-overlay')).toBeNull();
    });

    it('ejecuta movimientos correctos con botones de joystick (Ratón)', () => {
      render(<ControlPage />);
      
      const upBtn = screen.getByText('▲');
      const downBtn = screen.getByText('▼');
      const leftBtn = screen.getByText('◀');
      const rightBtn = screen.getByText('▶');

      // Probar presionar y soltar (Mousedown / Mouseup / Mouseleave)
      fireEvent.mouseDown(upBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 1 });
      fireEvent.mouseUp(upBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 0 });

      fireEvent.mouseDown(downBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: -1 });
      fireEvent.mouseLeave(downBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 0 });

      fireEvent.mouseDown(leftBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: -1, y: 0 });

      fireEvent.mouseDown(rightBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('ejecuta movimientos correctos con eventos táctiles (Móvil)', () => {
      render(<ControlPage />);
      const upBtn = screen.getByText('▲');

      fireEvent.touchStart(upBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 1 });
      
      fireEvent.touchEnd(upBtn);
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('previene defensivamente handleMove y handleStop si modo no es MANUAL', () => {
      // Simulate mode changing to AUTO but an event firing on a stale button reference
      const { rerender } = render(<ControlPage />);
      const upBtn = screen.getByText('▲');

      useRobotStore.mockReturnValue({ system: { mode: 'AUTO' }, sendManualMove: mockSendManualMove });
      rerender(<ControlPage />);

      fireEvent.mouseDown(upBtn);
      fireEvent.mouseUp(upBtn);

      expect(mockSendManualMove).not.toHaveBeenCalled();
    });
  });

  describe('Control por Teclado (Eventos Globales)', () => {
    it('ignora eventos de teclado si el modo NO ES MANUAL', () => {
      useRobotStore.mockReturnValue({ system: { mode: 'AUTO' }, sendManualMove: mockSendManualMove });
      render(<ControlPage />);
      
      fireEvent.keyDown(globalThis, { key: 'ArrowUp' });
      expect(mockSendManualMove).not.toHaveBeenCalled();
    });

    it('ejecuta movimientos mapeando teclas de flecha y WASD', () => {
      render(<ControlPage />);

      // Arriba
      fireEvent.keyDown(globalThis, { key: 'ArrowUp' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 1 });
      fireEvent.keyDown(globalThis, { key: 'w' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 1 });

      // Abajo
      fireEvent.keyDown(globalThis, { key: 'ArrowDown' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: -1 });
      fireEvent.keyDown(globalThis, { key: 'S' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: -1 });

      // Izquierda
      fireEvent.keyDown(globalThis, { key: 'ArrowLeft' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: -1, y: 0 });
      fireEvent.keyDown(globalThis, { key: 'a' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: -1, y: 0 });

      // Derecha
      fireEvent.keyDown(globalThis, { key: 'ArrowRight' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 1, y: 0 });
      fireEvent.keyDown(globalThis, { key: 'D' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('detiene el movimiento al soltar tecla', () => {
      render(<ControlPage />);
      
      fireEvent.keyUp(globalThis, { key: 'ArrowUp' });
      expect(mockSendManualMove).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('no hace nada si se presionan o sueltan teclas no registradas', () => {
      render(<ControlPage />);
      
      fireEvent.keyDown(globalThis, { key: 'x' }); // Tecla no válida
      fireEvent.keyUp(globalThis, { key: 'z' }); // Tecla no válida
      
      expect(mockSendManualMove).not.toHaveBeenCalled();
    });

    it('ignora presión de tecla si se mantiene presionada', () => {
      render(<ControlPage />);
      
      fireEvent.keyDown(globalThis, { key: 'ArrowUp', repeat: true });
      expect(mockSendManualMove).not.toHaveBeenCalled();
    });
  });
});
