import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ControlPanel from '../ControlPanel.jsx';
import { useRobotStore } from '../../../store/robotStore';

vi.mock('../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

describe('ControlPanel Component', () => {
  let storeMock;

  beforeEach(() => {
    storeMock = {
      system: { mode: 'IDLE', status: 'RUNNING', speedLimit: 50 },
      safeZone: [[0, 0], [1, 1]], 
      setSpeedLimit: vi.fn(),
      setControlMode: vi.fn(),
      togglePauseMission: vi.fn(),
      cancelMission: vi.fn(),
    };
    useRobotStore.mockReturnValue(storeMock);
    vi.clearAllMocks();
  });

  it('renderiza los modos de conducción y permite cambiarlos', () => {
    render(<ControlPanel />);
    
    const autoBtn = screen.getByText('control.auto');
    act(() => { fireEvent.click(autoBtn); });
    expect(storeMock.setControlMode).toHaveBeenCalledWith('AUTO');

    const manualBtn = screen.getByText('control.manual');
    act(() => { fireEvent.click(manualBtn); });
    expect(storeMock.setControlMode).toHaveBeenCalledWith('MANUAL');
  });

  it('añade la clase active al botón correcto según el modo actual', () => {
    storeMock.system.mode = 'AUTO';
    const { rerender } = render(<ControlPanel />);
    expect(screen.getByText('control.auto')).toHaveClass('active');
    expect(screen.getByText('control.manual')).not.toHaveClass('active');

    storeMock.system.mode = 'MANUAL';
    rerender(<ControlPanel />);
    expect(screen.getByText('control.manual')).toHaveClass('active');
  });

  it('permite ajustar el límite de velocidad y parsea el valor a entero', () => {
    render(<ControlPanel />);
    const slider = screen.getByRole('slider');
    
    // Al probar el input, aseguramos que Number.parseInt se ejecute
    act(() => { fireEvent.change(slider, { target: { value: '75' } }); });
    expect(storeMock.setSpeedLimit).toHaveBeenCalledWith(75);
  });

  it('cambia el estado visual del slider si la velocidad es mayor de 80', () => {
    storeMock.system.speedLimit = 85; // Dispara la clase 'high-speed'
    render(<ControlPanel />);
    expect(screen.getByRole('slider')).toHaveClass('high-speed');
  });

  describe('Control de Misión', () => {
    it('muestra el botón PAUSAR cuando la misión está en curso y lo ejecuta', () => {
      render(<ControlPanel />);
      const btn = screen.getByText(/control\.pause/i);
      act(() => { fireEvent.click(btn); });
      expect(storeMock.togglePauseMission).toHaveBeenCalled();
    });

    it('muestra el botón REANUDAR cuando la misión está pausada', () => {
      storeMock.system.status = 'PAUSED';
      render(<ControlPanel />);
      const btn = screen.getByText(/control\.resume/i);
      expect(btn).toHaveClass('btn-resume');
    });

    it('muestra el botón CANCELAR si hay un área activa y ejecuta la acción', () => {
      render(<ControlPanel />);
      const btn = screen.getByText(/control\.cancelMission/i);
      act(() => { fireEvent.click(btn); });
      expect(storeMock.cancelMission).toHaveBeenCalled();
    });

    it('oculta el botón CANCELAR si no hay área activa', () => {
      storeMock.safeZone = [];
      render(<ControlPanel />);
      expect(screen.queryByText(/control\.cancelMission/i)).not.toBeInTheDocument();
      
      storeMock.safeZone = null;
      render(<ControlPanel />);
      expect(screen.queryByText(/control\.cancelMission/i)).not.toBeInTheDocument();
    });
  });
});