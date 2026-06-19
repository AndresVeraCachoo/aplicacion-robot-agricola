import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MapView from '../MapView.jsx';
import { useRobotStore } from '../../../../store/robotStore';
import { useToast } from '../../../../context/ToastContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('../../../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

vi.mock('../../../../components/Modal.jsx', () => {
  const dummyPropType = () => null;
  const MockModal = ({ isOpen, children, title, onClose }) => (
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}<button type="button" onClick={onClose}>Close</button></div> : null
  );
  MockModal.propTypes = { isOpen: dummyPropType, children: dummyPropType, title: dummyPropType, onClose: dummyPropType };
  return { default: MockModal };
});

vi.mock('../FieldDataOverlay.jsx', () => {
  const dummyPropType = () => null;
  const MockOverlay = ({ metric }) => <div data-testid="field-overlay">{metric}</div>;
  MockOverlay.propTypes = { metric: dummyPropType };
  return { default: MockOverlay };
});

const shared = vi.hoisted(() => ({
  mapClickHandlers: [],
  mapMouseMoveHandler: null,
  mapInstance: {
    setView: vi.fn(),
    getContainer: vi.fn(() => ({ style: {} })),
    dragging: { disable: vi.fn(), enable: vi.fn() },
    distance: vi.fn(() => 15), 
  }
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(),
    icon: vi.fn(),
    Marker: { prototype: { options: {} } },
    DomEvent: { stopPropagation: vi.fn() },
    // Solución Test 1: Devolver un array explícito que coincida con la validación para setSafeZone
    latLng: vi.fn((lat, lng) => [lat, lng]),
  }
}));

vi.mock('react-leaflet', () => {
  const dummyPropType = () => null;

  const MapContainer = ({ children, ...props }) => <div data-testid="map-container" {...props}>{children}</div>;
  MapContainer.propTypes = { children: dummyPropType };

  const TileLayer = (props) => <div {...props} />;
  
  const Marker = ({ eventHandlers, ...props }) => <button type="button" data-testid="marker" onClick={eventHandlers?.click} {...props} />;
  Marker.propTypes = { eventHandlers: dummyPropType };

  const Polyline = (props) => <div data-testid="polyline" {...props} />;
  
  const Polygon = ({ eventHandlers, ...props }) => <button type="button" data-testid="polygon" onClick={eventHandlers?.click} {...props} />;
  Polygon.propTypes = { eventHandlers: dummyPropType };
  
  const CircleMarker = ({ eventHandlers, children, ...props }) => (
    <button type="button" data-testid="circle-marker" onClick={eventHandlers?.click} {...props}>{children}</button>
  );
  CircleMarker.propTypes = { children: dummyPropType, eventHandlers: dummyPropType };
  
  const LayersControl = ({ children, ...props }) => <div {...props}>{children}</div>;
  LayersControl.propTypes = { children: dummyPropType };

  LayersControl.BaseLayer = ({ children, checked, name, ...props }) => <div data-checked={checked} data-name={name} {...props}>{children}</div>;
  LayersControl.BaseLayer.propTypes = { children: dummyPropType, checked: dummyPropType, name: dummyPropType };
  
  const Tooltip = ({ children, direction, offset, opacity, ...props }) => (
    <div data-testid="tooltip" data-direction={direction} data-offset={offset} data-opacity={opacity} {...props}>{children}</div>
  );
  Tooltip.propTypes = { children: dummyPropType, direction: dummyPropType, offset: dummyPropType, opacity: dummyPropType };

  return {
    MapContainer, TileLayer, Marker, Polyline, Polygon, CircleMarker, LayersControl, Tooltip,
    useMap: () => shared.mapInstance,
    useMapEvents: (handlers) => {
      if (handlers.click) shared.mapClickHandlers.push(handlers.click);
      if (handlers.mousemove) shared.mapMouseMoveHandler = handlers.mousemove;
      return {};
    }
  };
});

describe('Componente MapView', () => {
  let robotStoreMock, toastMock;

  beforeEach(() => {
    vi.clearAllMocks();
    shared.mapClickHandlers = [];
    shared.mapMouseMoveHandler = null;

    robotStoreMock = {
      position: { lat: 40, lon: -3 },
      pathHistory: [{ lat: 40, lon: -3 }],
      system: { heading: 90 },
      agronomicData: [],
      safeZone: null,
      setSafeZone: vi.fn(),
      clearSafeZone: vi.fn(),
    };

    toastMock = { addToast: vi.fn() };

    useRobotStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(robotStoreMock);
      }
      return robotStoreMock;
    });
    
    useToast.mockReturnValue(toastMock);
  });

  it('renderiza el mapa y controles iniciales correctamente', () => {
    render(<MapView />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByText('mapAdv.layerOff')).toBeInTheDocument();
    expect(screen.getByTitle('mapAdv.drawArea')).toBeInTheDocument();
  });

  it('cambia métrica de mapa de calor', () => {
    render(<MapView />);
    const select = screen.getByTitle('mapAdv.selectHeatmap');
    
    act(() => { fireEvent.change(select, { target: { value: 'ph' } }); });
    expect(screen.getByTestId('field-overlay')).toHaveTextContent('ph');
  });

  describe('Flujo de Dibujo de Zona Segura', () => {

    it('cancela modo de dibujo mediante botón o tecla ESC', () => {
      render(<MapView />);
      const drawBtn = screen.getByTitle('mapAdv.drawArea');
      
      act(() => { fireEvent.click(drawBtn); });
      act(() => { fireEvent.keyDown(globalThis, { key: 'Escape' }); });
      expect(toastMock.addToast).toHaveBeenCalledWith('mapAdv.drawCancelled', 'info');
      
      act(() => { fireEvent.click(drawBtn); });
      const cancelBtn = screen.getByText(/users.cancel/i);
      act(() => { fireEvent.click(cancelBtn); });
      expect(toastMock.addToast).toHaveBeenCalledWith('mapAdv.drawCancelled', 'info');
    });
  });

  describe('Cálculos Agronómicos y Marcadores', () => {
    it('procesa marcadores dentro y fuera del polígono, y calcula promedios', () => {
      robotStoreMock.safeZone = [[0, 0], [0, 10], [10, 10], [10, 0]];
      
      robotStoreMock.agronomicData = [
        { id: 1, lat: 5, lon: 5, ph: 7, humidity: 50, temperature: 25, nitrogen: 10, phosphorus: 5, potassium: 8 },
        { id: 2, lat: 20, lon: 20, ph: 4, humidity: null }
      ];

      render(<MapView />);
      
      const markers = screen.getAllByTestId('circle-marker');
      expect(markers.length).toBeGreaterThan(0);

      const summaryBtn = screen.getByTitle('mapAdv.viewData');
      act(() => { fireEvent.click(summaryBtn); }); 
      
      expect(screen.getByText('7.0')).toBeInTheDocument(); 
      expect(screen.getByText('50%')).toBeInTheDocument(); 
      expect(screen.getByText('25.0°C')).toBeInTheDocument(); 
    });

    it('limpia la zona segura', () => {
      robotStoreMock.safeZone = [[0, 0], [1, 1]];
      render(<MapView />);
      
      const deleteBtn = screen.getByTitle('mapAdv.clearLimit');
      act(() => { fireEvent.click(deleteBtn); });
      
      expect(robotStoreMock.clearSafeZone).toHaveBeenCalled();
    });

    it('abre el SampleModal al hacer clic en un marcador agronómico', () => {
      robotStoreMock.safeZone = [[0, 0], [0, 10], [10, 10], [10, 0]];
      robotStoreMock.agronomicData = [{ id: 99, lat: 5, lon: 5, ph: null }];
      
      render(<MapView />);
      const markers = screen.getAllByTestId('circle-marker');
      
      act(() => { fireEvent.click(markers[0]); });
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText(/mapAdv.sample #99/)).toBeInTheDocument();
      expect(screen.getAllByText('mapAdv.notCollected')[0]).toBeInTheDocument();
      
      act(() => { fireEvent.click(screen.getByText('Close')); });
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  it('centra vista en robot usando CenterButtonInternal', () => {
    render(<MapView />);
    const centerBtn = screen.getByTitle('control.centerRobot');
    
    act(() => { fireEvent.click(centerBtn); });
    expect(shared.mapInstance.setView).toHaveBeenCalledWith([40, -3], 18, { animate: true });
  });

  it('actualiza coordenadas clicadas al hacer clic fuera del modo de dibujo', () => {
    render(<MapView />);
    // Simulamos un clic en el mapa llamando al handler registrado
    act(() => {
      shared.mapClickHandlers.forEach(handler => {
        handler({ latlng: { lat: 41, lng: -4 } });
      });
    });

    expect(screen.getByText(/41\.00000/)).toBeInTheDocument();
    expect(screen.getByText(/-4\.00000/)).toBeInTheDocument();
  });

  it('muestra resumen de zona al hacer clic en polígono de zona segura', () => {
    robotStoreMock.safeZone = [[0, 0], [0, 10], [10, 10], [10, 0]];
    robotStoreMock.agronomicData = [{ id: 1, lat: 5, lon: 5, ph: 7 }];
    render(<MapView />);

    const polygonBtn = screen.getByTestId('polygon');
    act(() => { fireEvent.click(polygonBtn); });

    expect(screen.getByText('mapAdv.areaSummary')).toBeInTheDocument();
  });
});
