import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BatteryModal from '../BatteryModal.jsx';
import { useRobotStore } from '../../../../store/robotStore';
import { useNavigate } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('../../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

// Hackeamos recharts con validación de props
vi.mock('recharts', () => {
  const dummyPropType = () => null;

  const ResponsiveContainer = ({ children }) => <div data-testid="recharts-responsive">{children}</div>;
  ResponsiveContainer.propTypes = { children: dummyPropType };

  const LineChart = ({ children }) => <svg data-testid="recharts-linechart">{children}</svg>;
  LineChart.propTypes = { children: dummyPropType };

  const Line = () => <path data-testid="recharts-line" />;
  const XAxis = () => <g data-testid="recharts-xaxis" />;
  const YAxis = () => <g data-testid="recharts-yaxis" />;
  const CartesianGrid = () => <g data-testid="recharts-grid" />;

  const Tooltip = ({ content }) => {
    return (
      <g data-testid="recharts-tooltip">
        {React.isValidElement(content) && (
          <>
            {React.cloneElement(content, { active: true, payload: [{ value: 85 }], label: '12:00' })}
            {React.cloneElement(content, { active: false })}
          </>
        )}
      </g>
    );
  };
  Tooltip.propTypes = { content: dummyPropType };

  return { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip };
});

describe('BatteryModal Component', () => {
  const mockNavigate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  it('renderiza el estado de DESCARGA (conectado pero no cargando)', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 80, status: 'DISCHARGING', voltage: 12.5, temperature: 25, health: 95 }, isConnected: true };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    
    expect(screen.getByText('80%')).toBeInTheDocument();
    // SOLUCIÓN: Usar getAllByText[0] para evitar conflictos con la leyenda del gráfico
    expect(screen.getAllByText('battery.discharging')[0]).toBeInTheDocument();
    expect(screen.getByText('12.5 V')).toBeInTheDocument();
    expect(screen.getByText('25 °C')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('renderiza el estado de CARGA y usa el color verde', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 90, status: 'CHARGING' }, isConnected: true };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    // SOLUCIÓN: Usar getAllByText[0]
    expect(screen.getAllByText('battery.charging')[0]).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('renderiza la alerta de batería baja (<= 20%)', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 15, status: 'DISCHARGING' }, isConnected: true };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    const percentageSpan = screen.getByText('15%');
    expect(percentageSpan).toHaveClass('text-alert');
  });

  it('renderiza el estado OFFLINE si no está conectado ni cargando', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 50, status: 'UNKNOWN' }, isConnected: false };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    expect(screen.getByText('header.offline')).toBeInTheDocument();
  });

  it('navega a los detalles de energía y cierra el modal al hacer clic en el enlace', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 100 }, isConnected: true };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    
    const detailsBtn = screen.getByText(/header.energyDetail/i);
    fireEvent.click(detailsBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/app/energy');
  });

  it('evalúa correctamente el renderizado de los fallbacks cuando no hay datos', () => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage: 0 }, isConnected: false };
      return selector(state);
    });

    render(<BatteryModal onClose={mockOnClose} />);
    expect(screen.getByText('0.0 V')).toBeInTheDocument();
    expect(screen.getByText('0.0 °C')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); 
  });
});