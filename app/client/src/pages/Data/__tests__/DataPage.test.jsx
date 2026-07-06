import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataPage from '../DataPage.jsx';
import { useRobotStore } from '../../../store/robotStore';
import { useMissions } from '../../../hooks/useMissions';
import { useToastStore } from '../../../store/toastStore';
import axios from 'axios';
import html2canvas from 'html2canvas';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

vi.mock('react-leaflet', () => ({
  MapContainer: function MockMap() { return <div data-testid="map-container">{arguments[0].children}</div>; },
  TileLayer: () => null,
  Polygon: () => null,
  CircleMarker: function MockMarker() { return <div data-testid="circle-marker">{arguments[0].children}</div>; },
  Popup: function MockPopup() { return <div>{arguments[0].children}</div>; },
  useMap: () => ({ flyTo: vi.fn() })
}));

vi.mock('../../../components/DateRangePicker', () => ({
  DateRangePicker: function MockPicker() {
    const onFilter = arguments[0].onFilter;
    return (
      <div>
        <button data-testid="mock-date-picker" onClick={() => onFilter('2026-01-01', '2026-01-31', '1')}>
          Filter
        </button>
        <button data-testid="mock-date-picker-clear" onClick={() => onFilter(null, null, null)}>
          Clear
        </button>
      </div>
    );
  }
}));

vi.mock('../../../features/dashboard/components/ChartWidget', () => ({
  default: () => <div data-testid="mock-chart">Chart</div>
}));

const mockT = (k) => k;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'es' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}));

vi.mock('../../../store/toastStore', () => ({ useToastStore: vi.fn() }));

vi.mock('../../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../../hooks/useMissions', () => ({ useMissions: vi.fn() }));

vi.mock('axios');

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: () => 'data:image/png;base64,...',
    height: 1000,
    width: 1000
  }))
}));

const mockPdfSave = vi.fn();
const mockPdfAddImage = vi.fn();
vi.mock('jspdf', () => ({
  default: class {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 210 } };
    }
    addImage = mockPdfAddImage;
    save = mockPdfSave;
  }
}));


describe('Componente DataPage', () => {
  let mockAddToast, mockDeleteSessionData, mockFetchMisiones, consoleSpy;
  let mockAgronomicData;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockAddToast = vi.fn();
    mockFetchMisiones = vi.fn();
    
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    useToastStore.mockReturnValue({ addToast: mockAddToast });
    
    useMissions.mockReturnValue({ 
      missions: [{ name: 'Misión A', workArea: { coordinates: [[[-3.1, 40.1]]] } }], 
      fetchMissions: mockFetchMisiones 
    });

    mockAgronomicData = Array.from({ length: 12 }).map((_, i) => {
      let timestamp = new Date(`2026-01-01T10:00:${i.toString().padStart(2, '0')}Z`).toISOString();
      if (i === 1) timestamp = new Date(`2026-01-01T07:00:00Z`).toISOString(); 

      return {
        id: i,
        timestamp,
        lat: 40 + (i * 0.01), lon: -3,
        humidity: i === 0 ? null : 50 + i,
        temperature: i === 0 ? null : 20 + i,
        ph: i === 0 ? null : 6 + (i * 0.1),
        nitrogen: i === 0 ? null : 10,
        phosphorus: i === 0 ? null : 10,
        potassium: i === 0 ? null : 10,
        radiation: i === 0 ? null : 300,
        missionName: i % 2 === 0 ? 'Mission A' : null, 
        executionId: i % 2 === 0 ? 1 : null
      };
    });

    mockDeleteSessionData = vi.fn((id) => {
      mockAgronomicData = mockAgronomicData.filter(d => `exec-${d.executionId}` !== id && `miss-${d.missionName}` !== id);
    });

    useRobotStore.mockImplementation((selector) => {
      const state = { 
        agronomicData: mockAgronomicData, 
        deleteSessionData: mockDeleteSessionData
      };
      if (typeof selector === 'function') return selector(state);
      return state;
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Paginación y Filtrado', () => {
    it('renderiza la tabla y maneja paginación', () => {
      renderWithProviders(<DataPage />);
      
      const nextBtn = screen.getByText('→');
      const prevBtn = screen.getByText('←');
      const jumpInput = screen.getByPlaceholderText('...');
      const goBtn = screen.getByText('data.go');

      fireEvent.click(nextBtn);
      expect(prevBtn).not.toBeDisabled();

      fireEvent.change(jumpInput, { target: { value: '1' } });
      fireEvent.click(goBtn);
      
      expect(nextBtn).not.toBeDisabled();
    });

    it('ajusta automáticamente currentPage si totalPages disminuye', async () => {
      renderWithProviders(<DataPage />);
      
      fireEvent.click(screen.getByText('→')); 

      axios.get.mockResolvedValueOnce({ data: [mockAgronomicData[0]] });
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      
      await waitFor(() => {
        expect(screen.queryByText(/data.waitingData/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('←')).toBeDisabled();
      expect(screen.getByText('→')).toBeDisabled();
    });
  });

  describe('Filtrado desde DateRangePicker', () => {
    it('filtra datos llamando a API y muestra Cargando', async () => {
      axios.get.mockResolvedValueOnce({ data: [{ id: 99, lat: 0, lon: 0, timestamp: new Date().toISOString() }] });
      renderWithProviders(<DataPage />);
      
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      expect(screen.getByText(/data.waitingData/)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('2 registros encontrados', 'info');
      });
    });

    it('captura errores de filtrado', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));
      renderWithProviders(<DataPage />);
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('data.fetchError', 'error');
      });
    });

    it('limpia filtros si todos se pasan como nulos', async () => {
      renderWithProviders(<DataPage />);
      
      axios.get.mockResolvedValueOnce({ data: [{ id: 99, lat: 0, lon: 0, timestamp: new Date().toISOString() }] });
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('2 registros encontrados', 'info');
      });

      fireEvent.click(screen.getByTestId('mock-date-picker-clear'));
      
      await waitFor(() => {
        expect(screen.getByText('12 data.totalRecords')).toBeInTheDocument();
      });
    });
  });

  describe('Historial de Sesiones (Misiones)', () => {
    it('agrupa datos en sesiones y permite seleccionar una', () => {
      renderWithProviders(<DataPage />);
      
      const sessionBtn = document.querySelector('.mission-item-main');
      fireEvent.click(sessionBtn);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByText('data.duration:')).toBeInTheDocument();
    });

    it('deselecciona automáticamente misión si se elimina la que se está viendo', () => {
      renderWithProviders(<DataPage />);
      
      const sessionBtns = document.querySelectorAll('.mission-item-main');
      fireEvent.click(sessionBtns[0]);
      expect(screen.getByText('data.duration:')).toBeInTheDocument(); 
      
      const deleteBtns = document.querySelectorAll('.btn-delete-session');
      fireEvent.click(deleteBtns[0]);
      
      expect(mockDeleteSessionData).toHaveBeenCalled();
      expect(screen.getByText('data.noSelection')).toBeInTheDocument();
    });

    it('exporta datos a CSV correctamente', () => {
      const originalCreateElement = document.createElement.bind(document);
      const mockClick = vi.fn();
      
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          const aElement = originalCreateElement('a');
          aElement.click = mockClick;
          return aElement;
        }
        return originalCreateElement(tag);
      });

      renderWithProviders(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main')); 
      
      const csvToggle = screen.getByText(/CSV ▾/i);
      fireEvent.click(csvToggle);
      
      const csvBtn = screen.getByText(/data.exportCsv/i);
      fireEvent.click(csvBtn);

      expect(mockClick).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('data.csvSuccess', 'success');

      document.createElement.mockRestore();
    });

    it('exporta reporte a PDF correctamente', async () => {
      renderWithProviders(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main'));
      
      const pdfToggle = screen.getByText(/PDF ▾/i);
      fireEvent.click(pdfToggle);

      const pdfBtn = screen.getByText(/data.exportPdf/i);
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(html2canvas).toHaveBeenCalled();
        expect(mockPdfSave).toHaveBeenCalled();
      });
    });

    it('captura errores de exportación a PDF', async () => {
      html2canvas.mockRejectedValueOnce(new Error('Canvas Error'));
      
      renderWithProviders(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main'));
      
      const pdfToggle = screen.getByText(/PDF ▾/i);
      fireEvent.click(pdfToggle);
      
      const pdfBtn = screen.getByText(/data.exportPdf/i);
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('data.pdfError', 'error');
      });
    });
  });
});