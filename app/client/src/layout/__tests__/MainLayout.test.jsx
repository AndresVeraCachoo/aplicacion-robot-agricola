import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainLayout from '../MainLayout.jsx';
import { useRobotStore } from '../../store/robotStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

const mockAddToast = vi.fn();
vi.mock('../../store/toastStore', () => ({
  useToastStore: vi.fn(() => ({ addToast: mockAddToast })),
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="mock-outlet">Mock Outlet</div>,
}));

vi.mock('../Header', () => ({
  default: ({ onMenuClick }) => <button type="button" data-testid="mock-header" onClick={onMenuClick}>Header Menu</button>
}));

vi.mock('../Sidebar', () => ({
  default: ({ isOpen, onClose }) => {
    const isMobile = window.innerWidth <= 768;
    return (
      <div data-testid="mock-sidebar">
        {/* SOLUCIÓN LN30: Usamos un button nativo en lugar de un div para satisfacer la accesibilidad (A11y) */}
        {isOpen && isMobile && (
          <button 
            type="button" 
            aria-label="Cerrar overlay" 
            className="sidebar-overlay" 
            onClick={onClose}
          ></button>
        )}
        <button type="button" data-testid="sidebar-close" onClick={onClose}>Close Sidebar</button>
      </div>
    );
  }
}));

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));

describe('Componente MainLayout', () => {
  const mockFetchInitialData = vi.fn();
  const mockConnectSocket = vi.fn();
  const mockDisconnectSocket = vi.fn();
  const mockSetSidebarOpen = vi.fn();
  const mockToggleSidebar = vi.fn();

  let mockState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockState = {
      isSidebarOpen: true,
      setSidebarOpen: mockSetSidebarOpen,
      toggleSidebar: mockToggleSidebar,
      fetchInitialData: mockFetchInitialData,
      connectSocket: mockConnectSocket,
      disconnectSocket: mockDisconnectSocket,
      isConnected: true,
      system: { emergencyStop: false, status: 'RUNNING' }
    };

    useRobotStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setWindowWidth = (width) => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, configurable: true, value: width });
  };

  it('ejecuta fetchInitialData, conectar y desconectar en ciclo de vida', () => {
    setWindowWidth(1024);
    const { unmount } = render(<MainLayout />);
    
    expect(mockFetchInitialData).toHaveBeenCalledTimes(1);
    expect(mockConnectSocket).toHaveBeenCalledTimes(1);

    unmount();
    
    expect(mockDisconnectSocket).toHaveBeenCalledTimes(1);
  });

  describe('Notificaciones del Sistema', () => {
    it('notifica al usuario al conectar y desconectar', () => {
      mockState.isConnected = false;
      const { rerender } = render(<MainLayout />);
      expect(mockAddToast).not.toHaveBeenCalled();

      mockState.isConnected = true;
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledWith('notifications.connectionSuccess', 'success');

      mockState.isConnected = false;
      rerender(<MainLayout />);
      
      mockState.isConnected = true;
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledWith('notifications.connectionSuccess', 'success');
    });

    it('gestiona la notificación de Parada de Emergencia', () => {
      mockState.isConnected = true;
      const { rerender } = render(<MainLayout />);
      
      mockAddToast.mockClear();

      mockState.system = { ...mockState.system, emergencyStop: true };
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledWith('notifications.emergencyActive', 'error');

      mockState.system = { ...mockState.system, emergencyStop: false };
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledWith('notifications.systemReady', 'success');
    });

    it('actualiza silenciosamente lastEmergencyState si robot se desconecta', () => {
      mockState.isConnected = false;
      mockState.system = { ...mockState.system, emergencyStop: true };
      
      // SOLUCIÓN LN135: Eliminada la extracción de { rerender } ya que no la usábamos aquí
      render(<MainLayout />); 
      
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('notifica cuando robot regresa a base por baja batería', () => {
      mockState.isConnected = true;
      const { rerender } = render(<MainLayout />);
      
      mockAddToast.mockClear();

      mockState.system = { ...mockState.system, status: 'RTL_ACTIVE' };
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledWith('notifications.rtlActive', 'warning');

      mockState.system = { ...mockState.system, status: 'RUNNING' };
      rerender(<MainLayout />);
      
      mockState.system = { ...mockState.system, status: 'RTL_ACTIVE' };
      rerender(<MainLayout />);
      expect(mockAddToast).toHaveBeenCalledTimes(2); 
    });
  });

  describe('Comportamiento Responsivo (Escritorio vs Móvil)', () => {
    it('Escritorio (>768px): Sidebar inicia y no muestra superposición', () => {
      setWindowWidth(1024);
      render(<MainLayout />);
      
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(document.querySelector('.sidebar-overlay')).toBeNull();
    });

    it('Móvil (<=768px): Muestra superposición cuando isSidebarOpen es verdadero', () => {
      setWindowWidth(500);
      render(<MainLayout />);
      
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      const overlay = document.querySelector('.sidebar-overlay');
      expect(overlay).toBeInTheDocument();

      act(() => { fireEvent.click(overlay); });
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('Móvil (<=768px): Función closeMobileSidebar oculta menú al navegar', () => {
      setWindowWidth(500);
      render(<MainLayout />);

      const sidebarCloseBtn = screen.getByTestId('sidebar-close');
      act(() => { fireEvent.click(sidebarCloseBtn); });

      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('Escritorio (>768px): Función closeMobileSidebar NO oculta menú al navegar', () => {
      setWindowWidth(1024);
      render(<MainLayout />);
      
      const sidebarCloseBtn = screen.getByTestId('sidebar-close');
      act(() => { fireEvent.click(sidebarCloseBtn); });

      expect(mockSetSidebarOpen).not.toHaveBeenCalled();
    });
  });
});
