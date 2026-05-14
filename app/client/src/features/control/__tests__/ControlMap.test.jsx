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

describe('ControlMap Component', () => {
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
      misiones: [
        { 
          id: '1', nombre: 'Misión Test', 
          area_trabajo: { coordinates: [[[ -3, 40 ], [ -3.00001, 40 ], [ -3.00001, 40.00001 ], [ -3, 40.00001 ]]] }, 
          tipo_tarea: 'Rociado', bateria_minima: 20, ancho_trabajo: 2 
        }
      ],
      fetchMisiones: vi.fn(),
      startMissionRun: vi.fn(),
    };

    toastMock = { addToast: vi.fn() };
    useRobotStore.mockReturnValue(robotStoreMock);
    useMissionStore.mockReturnValue(missionStoreMock);
    useToast.mockReturnValue(toastMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra loader si no hay GPS', () => {
    robotStoreMock.position = { lat: null, lon: null };
    render(<ControlMap />);
    expect(screen.getByText('control.loadingGPS')).toBeInTheDocument();
  });

  it('evalúa puntos de la misión y pasa a modo MANUAL si se completan', () => {
    robotStoreMock.totalMissionPoints = 10;
    render(<ControlMap />);
    expect(robotStoreMock.setControlMode).toHaveBeenCalledWith('MANUAL');
    expect(robotStoreMock.setTotalMissionPoints).toHaveBeenCalledWith(0);
  });

  it('renderiza mensaje sin misiones si el array está vacío', () => {
    missionStoreMock.misiones = [];
    render(<ControlMap />);
    act(() => { fireEvent.click(screen.getByText(/control\.missionsBtn/)); });
    expect(screen.getByText('control.noMissions')).toBeInTheDocument();
  });

  it('eventos avanzados de Geoman (Intersect, Area, Tooltip y Hectáreas)', () => {
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

  it('captura los clics del mapa con restricciones de dibujo (pm)', () => {
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
});