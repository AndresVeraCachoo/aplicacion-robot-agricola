import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import EnergyPage from '../EnergyPage.jsx';
import { useRobotStore } from '../../store/robotStore';
import { useMissionStore } from '../../store/missionStore';

// --- MOCKS EXTERNOS ---
vi.mock('axios');

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('../../components/DateRangePicker', () => ({
  DateRangePicker: function MockPicker() {
    const onFilter = arguments[0].onFilter;
    return (
      <button data-testid="mock-date-picker" onClick={() => onFilter('2026-01-01', '2026-01-31', '2')}>
        Filter
      </button>
    );
  }
}));

vi.mock('recharts', () => {
  const Dummy = () => null;
  return {
    AreaChart: function MockAreaChart() { return <div data-testid="recharts-area-chart">{arguments[0].children}</div>; },
    Area: Dummy,
    XAxis: function MockXAxis() { 
      if (arguments[0].tickFormatter) arguments[0].tickFormatter(Date.now());
      return <div />; 
    },
    YAxis: Dummy,
    CartesianGrid: Dummy,
    Tooltip: function MockTooltip() {
      if (arguments[0].labelFormatter) arguments[0].labelFormatter(Date.now());
      return <div />;
    },
    ResponsiveContainer: function MockResponsiveContainer() { return <div data-testid="recharts-container">{arguments[0].children}</div>; },
    Legend: Dummy,
  };
});

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../store/missionStore', () => ({ useMissionStore: vi.fn() }));

describe('EnergyPage Component', () => {
  let consoleSpy;
  let mockFetchMisiones;
  
  const MOCK_NOW = new Date('2026-01-02T12:00:00Z').getTime();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // FIX: SOLO mockeamos 'Date' a nivel global. Dejamos setTimeout vivo para que RTL (waitFor) funcione.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MOCK_NOW);
    
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetchMisiones = vi.fn();
    useMissionStore.mockReturnValue({ misiones: [], fetchMisiones: mockFetchMisiones });

    useRobotStore.mockImplementation((selector) => {
      const state = { 
        battery: { percentage: 80, status: 'DISCHARGING', voltage: 12, temperature: 30, health: 95 }
      };
      return selector(state);
    });

    useTranslation.mockReturnValue({
      t: (k, def) => def || k,
      i18n: { language: 'es-ES' }
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('Renderizado Inicial y KPIs', () => {
    it('muestra los datos de batería, amperaje y estado de carga', async () => {
      useRobotStore.mockImplementation((selector) => {
        return selector({ 
          battery: { percentage: 15, status: 'CHARGING', voltage: 12, temperature: 30, health: 95 }
        });
      });
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<EnergyPage />);

      expect(screen.getByText('~10.0 A')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('Cargando')).toBeInTheDocument();

      fireEvent.click(screen.getByText('←'));
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
    });

    it('calcula el amperaje como 0 si el voltaje es 0 o negativo', () => {
      useRobotStore.mockImplementation((selector) => {
        return selector({ battery: { percentage: 50, status: 'IDLE', voltage: 0 } });
      });
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<EnergyPage />);
      expect(screen.getByText('~0.0 A')).toBeInTheDocument(); 
    });
  });

  describe('Filtro de 24 horas y Auto-Refresh', () => {
    it('filtra los datos históricos para mostrar solo las últimas 24h si no hay filtros', async () => {
      const apiResponse = [
        { timestamp: new Date(MOCK_NOW - 1000 * 3600 * 2).toISOString(), bateria_porcentaje: 80, radiacion_solar: 150 }, 
        { timestamp: new Date(MOCK_NOW - 1000 * 3600 * 48).toISOString(), bateria_porcentaje: 90, radiacion_solar: 200 } 
      ];
      axios.get.mockResolvedValue({ data: apiResponse });

      render(<EnergyPage />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
        expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument();
        expect(screen.getByText('150 W/m²')).toBeInTheDocument();
        expect(screen.getByText('Panel Activo')).toBeInTheDocument();
      });
    });
  });

  describe('Filtro Activo (DateRangePicker)', () => {
    it('pasa los parámetros a la API, deshabilita el auto-refresh y maneja datos corruptos (NaN)', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'setTimeout', 'clearInterval', 'clearTimeout'] });
      vi.setSystemTime(MOCK_NOW);

      const apiResponse = [
        { timestamp: new Date(MOCK_NOW).toISOString(), bateria_porcentaje: "basura", radiacion_solar: null }
      ];
      axios.get.mockResolvedValue({ data: apiResponse });

      render(<EnergyPage />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('mock-date-picker'));
        await Promise.resolve();
      });

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('start=2026-01-01'));
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('misionId=2'));
      expect(screen.getByText('0 W/m²')).toBeInTheDocument();
      expect(screen.getByText('Standby / Noche')).toBeInTheDocument();

      axios.get.mockClear();

      // Avanzamos 16 segundos para comprobar que no lanza nuevas llamadas automáticas
      await act(async () => {
        vi.advanceTimersByTime(16000);
      });

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('captura correctamente los errores de la API', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Fail'));
      
      render(<EnergyPage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error cargando energía:", expect.any(Error));
        expect(screen.getByText('No se encontraron registros de energía para este filtro.')).toBeInTheDocument();
      });
    });
  });

  describe('Idioma y Formateo (Inglés)', () => {
    it('formatea las fechas en inglés si i18n language es "en"', async () => {
      useTranslation.mockReturnValue({
        t: (k, def) => def || k,
        i18n: { language: 'en-US' }
      });

      axios.get.mockResolvedValue({ data: [{ timestamp: new Date(MOCK_NOW).toISOString(), bateria_porcentaje: 80, radiacion_solar: 10 }] });

      render(<EnergyPage />);

      await waitFor(() => {
        expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument();
      });
    });
  });
});