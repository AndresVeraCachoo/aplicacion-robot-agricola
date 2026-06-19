import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MissionsPage from '../MissionsPage.jsx';
import { useRobotStore } from '../../store/robotStore';
import { useMissionStore } from '../../store/missionStore';
import { useToast } from '../../context/ToastContext';
import L from 'leaflet';

// --- MOCKS EXTERNOS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, def) => def || k,
    i18n: { language: 'es-ES' }
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../components/Modal', () => ({
  default: function MockModal() {
    const { isOpen, children, title } = arguments[0];
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
}));

vi.mock('@geoman-io/leaflet-geoman-free', () => ({}));

vi.mock('leaflet', () => {
  class MockPolygon {
    constructor() {
      this.pm = {};
    }
    addTo() { return this; }
    getBounds() { return { isValid: true }; }
    on(events, cb) {
      events.split(' ').forEach(e => { globalThis[`__polygon_${e}`] = cb; });
    }
    toGeoJSON() { 
      return { geometry: { type: 'Polygon', coordinates: [[[0, 0]]] } }; 
    }
  
    _pmTempLayer = false;
}

  return {
    default: {
      Icon: { Default: { prototype: { _getIconUrl: {} }, mergeOptions: vi.fn() } },
      DivIcon: vi.fn(),
      polygon: vi.fn(() => new MockPolygon()),
      Polygon: MockPolygon
    }
  };
});

const mockMapInstance = {
  setView: vi.fn(),
  pm: {
    setGlobalOptions: vi.fn(),
    setLang: vi.fn(),
    addControls: vi.fn(),
    removeControls: vi.fn(),
  },
  on: (event, cb) => { globalThis.__mapOnCallbacks[event] = cb; },
  off: (event) => { delete globalThis.__mapOnCallbacks[event]; },
  eachLayer: (cb) => {
    if (globalThis.__mockLayers) globalThis.__mockLayers.forEach(cb);
  },
  removeLayer: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn()
};

vi.mock('react-leaflet', () => {
  const Dummy = () => null;
  return {
    MapContainer: function MockMap() { 
      const { children, center } = arguments[0];
      return <div data-testid="map-container" data-center={center?.join(',')}>{children}</div>; 
    },
    TileLayer: Dummy,
    Marker: Dummy,
    Popup: Dummy,
    useMap: () => mockMapInstance,
    useMapEvents: function MockMapEvents() {
      const handlers = arguments[0];
      if (handlers.click) globalThis.__triggerMapClick = handlers.click;
      return null;
    }
  };
});

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../store/missionStore', () => ({ useMissionStore: vi.fn() }));

describe('Componente MissionsPage', () => {
  let mockAddToast, consoleSpy;
  let mockFetchMisiones, mockCreateMision, mockUpdateMision, mockDeleteMision;

  const mockMissiones = [
    {
      id: 1,
      name: 'Misión Test',
      taskType: 'Humedad, Temp',
      minBattery: 30,
      workingWidth: 2,
      passAngle: 0,
      workArea: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__mapOnCallbacks = {};
    globalThis.__mockLayers = [];
    
    mockAddToast = vi.fn();
    useToast.mockReturnValue({ addToast: mockAddToast });
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetchMisiones = vi.fn();
    mockCreateMision = vi.fn().mockResolvedValue(true);
    mockUpdateMision = vi.fn().mockResolvedValue(true);
    mockDeleteMision = vi.fn().mockResolvedValue(true);

    useMissionStore.mockReturnValue({
      missions: mockMissiones,
      fetchMissions: mockFetchMisiones,
      createMission: mockCreateMision,
      updateMission: mockUpdateMision,
      deleteMission: mockDeleteMision
    });

    useRobotStore.mockImplementation((selector) => {
      const state = { position: { lat: 42, lon: -3 }, system: { heading: 90 } };
      if (typeof selector === 'function') return selector(state);
      return state;
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Interacciones del Mapa y Componentes Internos', () => {
    it('centra el mapa en el robot al hacer clic en botón central', () => {
      render(<MissionsPage />);
      const centerBtn = screen.getByTitle('missions.map.centerRobot');
      fireEvent.click(centerBtn);
      expect(mockMapInstance.setView).toHaveBeenCalledWith([42, -3], 19);
    });

    it('registra coordenadas al hacer clic libremente en el mapa', () => {
      render(<MissionsPage />);
      act(() => {
        globalThis.__triggerMapClick({
          target: { pm: {} }, 
          latlng: { lat: 40.12345, lng: -3.6789 }
        });
      });
      expect(screen.getByText(/40.12345/)).toBeInTheDocument();
      expect(screen.getByText(/-3.67890/)).toBeInTheDocument();
    });

    it('usa coordenadas de respaldo si robot no tiene posición válida', () => {
      useRobotStore.mockImplementation((selector) => {
        const state = { position: {}, system: {} };
        if (typeof selector === 'function') return selector(state);
        return state;
      });
      render(<MissionsPage />);
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer.dataset.center).toBe('37.7749,-122.4194');
    });
  });

  describe('Eventos de Geoman', () => {
    it('muestra error si el polígono se auto-interseca y lo elimina', () => {
      render(<MissionsPage />);
      act(() => {
        globalThis.__mapOnCallbacks['pm:create']({
          layer: { pm: { hasSelfIntersection: () => true } }
        });
      });
      expect(mockAddToast).toHaveBeenCalledWith('El polígono no puede cruzarse a sí mismo.', 'error');
      expect(mockMapInstance.removeLayer).toHaveBeenCalled();
    });

    it('asigna polígono, limpia capas previas y habilita edición', () => {
      globalThis.__mockLayers = [new L.Polygon()];
      render(<MissionsPage />);
      
      act(() => {
        globalThis.__mapOnCallbacks['pm:create']({
          layer: {
            pm: { hasSelfIntersection: () => false },
            toGeoJSON: () => ({ geometry: { type: 'Polygon', coordinates: [] } }),
            on: (eventStr, cb) => {
              eventStr.split(' ').forEach(e => globalThis[`__layer_${e}`] = cb);
            }
          }
        });
      });

      act(() => {
        globalThis['__layer_pm:edit']({ target: { toGeoJSON: () => ({ geometry: { type: 'Polygon' } }) } });
        globalThis['__layer_pm:cut']({ layer: { toGeoJSON: () => ({ geometry: { type: 'Polygon' } }) } });
      });
      
      expect(mockMapInstance.removeLayer).toHaveBeenCalled(); 
    });

    it('limpia área de trabajo cuando se elimina capa', () => {
      render(<MissionsPage />);
      act(() => {
        globalThis.__mapOnCallbacks['pm:remove']();
      });
      
      // FIX: Rellenamos el nombre para que el formulario no bloquee el submit nativo
      fireEvent.change(document.querySelector('input[id="mission-name"]'), { target: { value: 'Misión Test' } });
      fireEvent.click(screen.getByText('missions.form.saveBtn'));
      expect(mockAddToast).toHaveBeenCalledWith('Dibuja el área de trabajo en el mapa primero.', 'error');
    });
  });

  describe('Validación y Creación de Misión', () => {
    
    // Silenciamos el warning del Scroll de JSDOM
    beforeEach(() => {
      window.scrollTo = vi.fn();
    });

    it('muestra error si se intenta guardar sin sensores seleccionados', () => {
      render(<MissionsPage />);
      
      act(() => {
        globalThis.__mapOnCallbacks['pm:create']({
          layer: {
            pm: { hasSelfIntersection: () => false },
            toGeoJSON: () => ({ geometry: { type: 'Polygon', coordinates: [] } }),
            on: vi.fn()
          }
        });
      });

      // FIX: Rellenamos el nombre para que HTML5 nos deje enviar el formulario
      fireEvent.change(document.querySelector('input[id="mission-name"]'), { target: { value: 'Misión Sin Sensores' } });

      // Desmarcamos el único sensor activo (Humedad)
      const humCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(humCheckbox);

      fireEvent.click(screen.getByText('missions.form.saveBtn'));
      
      expect(mockAddToast).toHaveBeenCalledWith('Selecciona al menos un tipo de dato.', 'error');
      expect(mockCreateMision).not.toHaveBeenCalled();
    });

    it('crea la misión correctamente', async () => {
      render(<MissionsPage />);
      
      act(() => {
        globalThis.__mapOnCallbacks['pm:create']({
          layer: {
            pm: { hasSelfIntersection: () => false },
            toGeoJSON: () => ({ geometry: { type: 'Polygon', coordinates: [] } }),
            on: vi.fn()
          }
        });
      });

      fireEvent.change(document.querySelector('input[id="mission-name"]'), { target: { value: 'Misión Alfa' } });
      fireEvent.click(screen.getByText('missions.form.saveBtn'));

      await waitFor(() => {
        expect(mockCreateMision).toHaveBeenCalledWith(expect.objectContaining({ name: 'Misión Alfa' }));
        expect(mockAddToast).toHaveBeenCalledWith('¡Misión creada con éxito!', 'success');
      });
    });

    it('maneja error del servidor al intentar crear', async () => {
      mockCreateMision.mockRejectedValueOnce(new Error('API Down'));
      render(<MissionsPage />);
      
      act(() => {
        globalThis.__mapOnCallbacks['pm:create']({
          layer: {
            pm: { hasSelfIntersection: () => false },
            toGeoJSON: () => ({ geometry: { type: 'Polygon', coordinates: [] } }),
            on: vi.fn()
          }
        });
      });

      fireEvent.change(document.querySelector('input[id="mission-name"]'), { target: { value: 'Misión Error' } });
      fireEvent.click(screen.getByText('missions.form.saveBtn'));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Ocurrió un error al guardar la misión', 'error');
      });
    });
  });

  describe('Edición y Cancelación', () => {
    it('llena el formulario, carga polígono de edición y permite guardar', async () => {
      render(<MissionsPage />);
      
      const editBtn = screen.getByText('Editar');
      fireEvent.click(editBtn);

      expect(document.querySelector('input[id="mission-name"]').value).toBe('Misión Test');
      expect(screen.getByText('Actualizar Misión')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Actualizar Misión'));

      await waitFor(() => {
        expect(mockUpdateMision).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Misión Test' }));
        expect(mockAddToast).toHaveBeenCalledWith('Misión actualizada correctamente', 'success');
      });
    });

    it('muestra error si updateMission devuelve falso', async () => {
      mockUpdateMision.mockResolvedValueOnce(false);
      render(<MissionsPage />);
      
      fireEvent.click(screen.getByText('Editar'));
      fireEvent.click(screen.getByText('Actualizar Misión'));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Error al actualizar la misión', 'error');
      });
    });

    it('permite cancelar la edición y limpia el mapa', () => {
      render(<MissionsPage />);
      
      fireEvent.click(screen.getByText('Editar'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(document.querySelector('input[id="mission-name"]').value).toBe('');
    });
  });

  describe('Borrado de Misión', () => {
    it('abre modal, cancela borrado y luego lo ejecuta correctamente', async () => {
      render(<MissionsPage />);
      
      fireEvent.click(screen.getByText('missions.card.deleteBtn'));
      expect(screen.getByText('Eliminar Misión')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockDeleteMision).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('missions.card.deleteBtn'));
      fireEvent.click(screen.getByText('Eliminar'));

      await waitFor(() => {
        expect(mockDeleteMision).toHaveBeenCalledWith(1);
        expect(mockAddToast).toHaveBeenCalledWith('Misión eliminada correctamente', 'info');
      });
    });

    it('captura error si API de borrado falla', async () => {
      mockDeleteMision.mockRejectedValueOnce(new Error('Delete Fail'));
      render(<MissionsPage />);
      
      fireEvent.click(screen.getByText('missions.card.deleteBtn'));
      fireEvent.click(screen.getByText('Eliminar'));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Error al eliminar la misión', 'error');
        expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });
});
