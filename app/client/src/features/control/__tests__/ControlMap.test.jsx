import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import L from 'leaflet';
import ControlMap from '../ControlMap.jsx';
import { useRobotStore } from '../../../store/robotStore';
import { useMissionStore } from '../../../store/missionStore';
import { useToast } from '../../../context/ToastContext';

const shared = vi.hoisted(() => ({
  geodesicArea: () => 10000,
  mapEventHandlers: {},
  mapClickHandler: null,
  geomanLayers: [],
  mapInstance: null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../../store/missionStore', () => ({ useMissionStore: vi.fn() }));

// Mock completo de Leaflet
vi.mock('leaflet', () => {
  class MockPolygon {
    constructor(latlngs) {
      this.latlngs = latlngs;
      this._pmTempLayer = false;
    }
    getLatLngs() { return this.latlngs; }
    getTooltip() { return this.tooltip; }
    setTooltipContent(content) { this.tooltip = content; }
    bindTooltip(content) { this.tooltip = content; }
    on(evt, cb) {
      if (evt.includes('pm:edit')) this.editCb = cb;
      if (evt.includes('pm:cut')) this.cutCb = cb;
    }
    off() { return this; }
    addTo() { return this; }
    triggerEdit() { if (this.editCb) this.editCb({ target: this }); }
    triggerCut() { if (this.cutCb) this.cutCb({ layer: this }); }
  }

  return {
    default: {
      icon: vi.fn(),
      DivIcon: vi.fn(),
      Marker: { prototype: { options: {} } },
      polygon: (latlngs) => new MockPolygon(latlngs),
      Polygon: MockPolygon,
      GeometryUtil: { geodesicArea: (...args) => shared.geodesicArea(...args) },
      DomEvent: { stopPropagation: vi.fn() },
    },
  };
});

vi.mock('@geoman-io/leaflet-geoman-free', () => ({}));

// Mock de React-Leaflet
vi.mock('react-leaflet', () => {
  const dummyPropType = () => null;

  const MapContainer = ({ children }) => <div data-testid="map">{children}</div>;
  MapContainer.propTypes = { children: dummyPropType };

  const TileLayer = () => <div data-testid="tile-layer" />;

  const Marker = ({ children, eventHandlers }) => (
    <button
      type="button"
      data-testid="marker"
      onClick={eventHandlers?.click}
      style={{ display: 'block', background: 'none', border: 'none', padding: 0 }}
    >
      {children}
    </button>
  );
  Marker.propTypes = { children: dummyPropType, eventHandlers: dummyPropType };

  const Popup = ({ children }) => <div data-testid="popup">{children}</div>;
  Popup.propTypes = { children: dummyPropType };

  const Polyline = () => <div data-testid="polyline" />;
  const Polygon = () => <div data-testid="polygon" />;

  const Tooltip = ({ children }) => <div data-testid="tooltip">{children}</div>;
  Tooltip.propTypes = { children: dummyPropType };

  return {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    Polygon,
    Tooltip,
    useMap: () => {
      if (!shared.mapInstance) {
        shared.mapInstance = {
          setView: vi.fn(),
          invalidateSize: vi.fn(),
          pm: {
            setGlobalOptions: vi.fn(),
            setLang: vi.fn(),
            addControls: vi.fn(),
            removeControls: vi.fn(),
            getGeomanLayers: vi.fn(() => shared.geomanLayers),
          },
          on: vi.fn((e, cb) => { shared.mapEventHandlers[e] = cb; }),
          off: vi.fn((e) => { delete shared.mapEventHandlers[e]; }),
          eachLayer: vi.fn((cb) => shared.geomanLayers.forEach((layer) => cb(layer))),
          removeLayer: vi.fn((l) => { shared.geomanLayers = shared.geomanLayers.filter((x) => x !== l); }),
          getZoom: vi.fn(() => 18),
        };
      }
      return shared.mapInstance;
    },
    useMapEvents: (handlers) => {
      if (handlers.click) shared.mapClickHandler = handlers.click;
      return {};
    },
  };
});

describe('Componente ControlMap', () => {
  let robotStoreMock, missionStoreMock, toastMock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'] });
    
    shared.geodesicArea = vi.fn().mockReturnValue(10000);
    shared.mapEventHandlers = {};
    shared.mapClickHandler = null;
    shared.geomanLayers = [];
    shared.mapInstance = null;

    robotStoreMock = {
      position: { lat: 40, lon: -3 },
      navTarget: null,
      navQueue: [],
      pathHistory: [],
      system: { mode: 'IDLE', status: 'IDLE', battery: 100, heading: 0 },
      safeZone: [[40, -3], [40.1, -3.1]],
      totalMissionPoints: 0,
      setSafeZone: vi.fn(),
      setControlMode: vi.fn(),
      navigateToPoint: vi.fn(),
      queueNavigationPoint: vi.fn(),
      setTotalMissionPoints: vi.fn(),
      clearSafeZone: vi.fn(),
    };

    missionStoreMock = {
      missions: [
        { 
          id: '1', name: 'Misión Test', 
          workArea: { coordinates: [[[ -3, 40 ], [ -3.00001, 40 ], [ -3.00001, 40.00001 ], [ -3, 40.00001 ]]] }, 
          taskType: 'Rociado', minBattery: 20, workingWidth: 2 
        }
      ],
      fetchMissions: vi.fn(),
      startMissionRun: vi.fn(),
    };

    toastMock = { addToast: vi.fn() };
    
    useRobotStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(robotStoreMock);
      }
      return robotStoreMock;
    });
    
    useMissionStore.mockReturnValue(missionStoreMock);
    useToast.mockReturnValue(toastMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra cargador si no hay GPS', () => {
    robotStoreMock.position = { lat: null, lon: null };
    render(<ControlMap />);
    expect(screen.getByText('control.loadingGPS')).toBeInTheDocument();
  });

  it('evalúa puntos de misión y cambia a modo MANUAL si se completó', () => {
    robotStoreMock.totalMissionPoints = 10;
    render(<ControlMap />);
    expect(robotStoreMock.setControlMode).toHaveBeenCalledWith('MANUAL');
    expect(robotStoreMock.setTotalMissionPoints).toHaveBeenCalledWith(0);
  });

  it('muestra mensaje de no hay misiones si el arreglo está vacío', () => {
    missionStoreMock.missions = [];
    render(<ControlMap />);
    act(() => { fireEvent.click(screen.getByText(/control\.missionsBtn/)); });
    expect(screen.getByText('control.noMissions')).toBeInTheDocument();
  });

  it('eventos avanzados de Geoman (Intersección, Área, Tooltip y Hectáreas)', () => {
    render(<ControlMap />);
    
    const badLayer = new L.Polygon();
    badLayer.pm = { hasSelfIntersection: () => true };
    act(() => { shared.mapEventHandlers['pm:create']({ layer: badLayer }); });
    expect(toastMock.addToast).toHaveBeenCalledWith(expect.any(String), 'error');

    const outerRing = [ { lat: 0, lng: 0 }, { lat: 2, lng: 0 }, { lat: 2, lng: 2 }, { lat: 0, lng: 2 } ];
    const innerRing = [ { lat: 0.5, lng: 0.5 }, { lat: 1.5, lng: 0.5 }, { lat: 1.5, lng: 1.5 }, { lat: 0.5, lng: 1.5 } ];
    const hugeLayer = new L.Polygon([outerRing, innerRing]);
    
    shared.geomanLayers.push(hugeLayer);
    
    act(() => { shared.mapEventHandlers['pm:create']({ layer: hugeLayer }); });
    expect(robotStoreMock.setSafeZone).toHaveBeenCalled();

    act(() => {
      shared.mapEventHandlers['pm:drawstart']();
      shared.mapEventHandlers['pm:drawend']();
      vi.advanceTimersByTime(350); 
      
      shared.mapEventHandlers['pm:globaldragmodetoggled']({ enabled: true });
      shared.mapEventHandlers['pm:globalrotatemodetoggled']({ enabled: true });

      hugeLayer.triggerEdit();
      hugeLayer.triggerCut();
    });

    shared.geomanLayers = []; 
    act(() => { shared.mapEventHandlers['pm:remove'](); });
    expect(robotStoreMock.clearSafeZone).toHaveBeenCalled();
  });

  it('captura clics en el mapa con restricciones de dibujo (pm)', () => {
    robotStoreMock.navTarget = { lat: 40.01, lon: -3.01 }; 
    robotStoreMock.navQueue = [{ lat: 40.02, lon: -3.02 }];
    render(<ControlMap />);
    
    act(() => {
      if (shared.mapClickHandler) shared.mapClickHandler({ 
        latlng: { lat: 41, lng: -4 }, originalEvent: {}, 
        target: { pm: { globalDrawModeEnabled: () => true } } 
      });
    });
    expect(robotStoreMock.navigateToPoint).not.toHaveBeenCalled();

    act(() => {
      if (shared.mapClickHandler) shared.mapClickHandler({ 
        latlng: { lat: 41, lng: -4 }, originalEvent: {}, target: { pm: {} } 
      });
    });
    expect(robotStoreMock.navigateToPoint).toHaveBeenCalledWith(41, -4);
  });

  it('dispara centrar mapa cuando se hace clic en botón central', () => {
    render(<ControlMap />);
    const centerBtn = screen.getByTitle('control.centerRobot');
    fireEvent.click(centerBtn);
    expect(shared.mapInstance.setView).toHaveBeenCalledWith([40, -3], 19);
  });

  it('maneja clic en marcador de estación base', () => {
    render(<ControlMap />);
    // Buscamos el marcador base buscando su evento de click que es disparado por nuestro mock
    const markers = screen.getAllByTestId('marker');
    // El primero es la base, el segundo es el robot
    fireEvent.click(markers[0]);
    expect(robotStoreMock.navigateToPoint).toHaveBeenCalledWith(42.36317, -3.69882);
    expect(toastMock.addToast).toHaveBeenCalledWith('control.returningToBase', 'info');
  });

  it('genera ruta e inicia misión automática', async () => {
    robotStoreMock.system.battery = 100;
    render(<ControlMap />);
    
    // Open panel
    act(() => { fireEvent.click(screen.getByText(/control\.missionsBtn/)); });
    
    // Hover mission to cover `hoveredZigZag` generator
    const missionCard = screen.getByRole('article', { name: 'Misión: Misión Test' });
    fireEvent.mouseEnter(missionCard);
    
    // Load mission
    const loadBtn = screen.getByText('control.loadZone');
    fireEvent.click(loadBtn);
    
    // Start mission
    const startBtn = screen.getByText('control.startAuto');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(missionStoreMock.startMissionRun).toHaveBeenCalledWith('1');
    expect(robotStoreMock.setControlMode).toHaveBeenCalledWith('AUTO');
  });

  it('rechaza inicio de misión si batería es baja', () => {
    robotStoreMock.system.battery = 10;
    render(<ControlMap />);
    
    act(() => { fireEvent.click(screen.getByText(/control\.missionsBtn/)); });
    const loadBtn = screen.getByText('control.loadZone');
    fireEvent.click(loadBtn);

    expect(toastMock.addToast).toHaveBeenCalledWith(expect.stringContaining('Batería insuficiente'), 'error');
  });
});
