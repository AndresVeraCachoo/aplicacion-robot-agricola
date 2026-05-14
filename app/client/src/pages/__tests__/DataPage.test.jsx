import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataPage from '../DataPage.jsx';
import { useRobotStore } from '../../store/robotStore';
import { useMissionStore } from '../../store/missionStore';
import { useToast } from '../../context/ToastContext';
import axios from 'axios';
import html2canvas from 'html2canvas';

// --- MOCKS EXTERNOS LIMPIOS PARA SONARQUBE ---
vi.mock('react-leaflet', () => ({
  MapContainer: function MockMap() { return <div data-testid="map-container">{arguments[0].children}</div>; },
  TileLayer: () => null,
  Polygon: () => null,
  CircleMarker: function MockMarker() { return <div data-testid="circle-marker">{arguments[0].children}</div>; },
  Popup: function MockPopup() { return <div>{arguments[0].children}</div>; },
  useMap: () => ({ flyTo: vi.fn() })
}));

vi.mock('../../components/DateRangePicker', () => ({
  DateRangePicker: function MockPicker() {
    const onFilter = arguments[0].onFilter;
    return (
      <button data-testid="mock-date-picker" onClick={() => onFilter('2026-01-01', '2026-01-31', '1')}>
        Filter
      </button>
    );
  }
}));

vi.mock('../../features/dashboard/components/ChartWidget', () => ({
  default: () => <div data-testid="mock-chart">Chart</div>
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../store/missionStore', () => ({ useMissionStore: vi.fn() }));

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

// --- INICIO DE LOS TESTS ---
describe('DataPage Component', () => {
  let mockAddToast, mockDeleteSessionData, mockFetchMisiones, consoleSpy;
  let mockAgronomicData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast = vi.fn();
    mockFetchMisiones = vi.fn();
    
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    useToast.mockReturnValue({ addToast: mockAddToast });
    
    useMissionStore.mockReturnValue({ 
      misiones: [{ nombre: 'Misión A', area_trabajo: { coordinates: [[[-3.1, 40.1]]] } }], 
      fetchMisiones: mockFetchMisiones 
    });

    mockAgronomicData = Array.from({ length: 12 }).map((_, i) => {
      let phValue = 7;
      if (i < 5) phValue = 5;
      else if (i > 8) phValue = 9;

      let timestamp = new Date(`2026-01-01T10:00:${i.toString().padStart(2, '0')}Z`).toISOString();
      if (i === 1) timestamp = new Date(`2026-01-01T07:00:00Z`).toISOString(); 

      return {
        id: i,
        timestamp,
        lat: 40 + (i * 0.01), lon: -3,
        humedad: i === 0 ? null : 50 + i,
        temperatura_suelo: i === 0 ? null : 20 + i,
        ph: i === 0 ? null : phValue,
        nitrogeno: i === 0 ? null : 10,
        fosforo: i === 0 ? null : 10,
        potasio: i === 0 ? null : 10,
        radiacion_solar: i === 0 ? null : 300,
        nombre_mision: i % 2 === 0 ? 'Misión A' : null, 
        ejecucion_id: i % 2 === 0 ? 1 : null
      };
    });

    mockDeleteSessionData = vi.fn((id) => {
      mockAgronomicData = mockAgronomicData.filter(d => `exec-${d.ejecucion_id}` !== id && `miss-${d.nombre_mision}` !== id);
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
    it('renderiza la tabla y gestiona la paginación (Next, Prev, Jump)', () => {
      render(<DataPage />);
      
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

    it('ajusta currentPage automáticamente si totalPages disminuye (ej. al filtrar)', async () => {
      render(<DataPage />);
      
      // 1. Vamos a la página 2
      fireEvent.click(screen.getByText('→')); 

      // 2. Simulamos que el filtro devuelve un solo registro
      axios.get.mockResolvedValueOnce({ data: [mockAgronomicData[0]] });
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      
      // 3. SOLUCIÓN ANTI-FLAKY: Esperamos a que la petición termine 
      // comprobando que el estado de "Cargando..." ha desaparecido.
      await waitFor(() => {
        expect(screen.queryByText(/data.waitingData/i)).not.toBeInTheDocument();
      });

      // 4. Verificamos algo ÚNICO en lugar de buscar un número "1". 
      // Si estamos en la página 1 y solo hay 1 página, AMBOS botones deben estar bloqueados.
      expect(screen.getByText('←')).toBeDisabled();
      expect(screen.getByText('→')).toBeDisabled();
    });
  });

  describe('Filtrado desde DateRangePicker', () => {
    it('filtra datos haciendo llamada a la API y muestra Loading', async () => {
      axios.get.mockResolvedValueOnce({ data: [{ id: 99, lat: 0, lon: 0, timestamp: new Date().toISOString() }] });
      render(<DataPage />);
      
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      expect(screen.getByText(/data.waitingData/)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('data.recordsFound', 'info');
      });
    });

    it('captura errores al filtrar', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));
      render(<DataPage />);
      fireEvent.click(screen.getByTestId('mock-date-picker'));
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('data.fetchError', 'error');
      });
    });
  });

  describe('Historial de Sesiones (Misiones)', () => {
    it('agrupa los datos en sesiones y permite seleccionar una', () => {
      render(<DataPage />);
      
      const sessionBtn = document.querySelector('.mission-item-main');
      fireEvent.click(sessionBtn);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByText('data.duration:')).toBeInTheDocument();
    });

    it('deselecciona la misión automáticamente si la que estabas viendo se elimina', () => {
      render(<DataPage />);
      
      const sessionBtns = document.querySelectorAll('.mission-item-main');
      fireEvent.click(sessionBtns[0]);
      expect(screen.getByText('data.duration:')).toBeInTheDocument(); 
      
      const deleteBtns = document.querySelectorAll('.btn-delete-session');
      fireEvent.click(deleteBtns[0]);
      
      expect(mockDeleteSessionData).toHaveBeenCalled();
      expect(screen.getByText('data.noSelection')).toBeInTheDocument();
    });

    it('exporta los datos a CSV correctamente', () => {
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

      render(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main')); 
      
      const csvBtn = screen.getByText(/data.exportCsv/);
      fireEvent.click(csvBtn);

      expect(mockClick).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('data.csvSuccess', 'success');

      document.createElement.mockRestore();
    });

    it('exporta el informe a PDF correctamente', async () => {
      render(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main'));
      
      const pdfBtn = screen.getByText(/data.exportPdf/);
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(html2canvas).toHaveBeenCalled();
        expect(mockPdfSave).toHaveBeenCalled();
      });
    });

    it('captura errores al exportar PDF', async () => {
      html2canvas.mockRejectedValueOnce(new Error('Canvas Error'));
      
      render(<DataPage />);
      fireEvent.click(document.querySelector('.mission-item-main'));
      
      const pdfBtn = screen.getByText(/data.exportPdf/);
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('data.pdfError', 'error');
      });
    });
  });
});