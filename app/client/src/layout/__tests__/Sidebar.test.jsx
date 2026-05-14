import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => {
      // Forzamos un valor falsy para cubrir la rama del fallback ( || "Close sidebar" )
      if (k === 'modal.close') return undefined;
      return k;
    }
  }),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Sidebar Component', () => {
  const mockOnClose = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Estado de apertura y estilos condicionales (Branch Coverage)', () => {
    it('renderiza y aplica atributos correctos cuando isOpen es TRUE', () => {
      useAuth.mockReturnValue({ userRole: 'basico', logout: mockLogout });
      renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const overlay = document.querySelector('.sidebar-overlay-bg');
      expect(overlay).toHaveClass('visible');
      expect(overlay).toHaveAttribute('tabindex', '0');
      // Verificamos que el fallback del aria-label funciona al no haber traducción
      expect(overlay).toHaveAttribute('aria-label', 'Close sidebar');

      const aside = document.querySelector('.sidebar');
      expect(aside).toHaveClass('open');
      expect(aside).not.toHaveClass('closed');
    });

    it('renderiza y aplica atributos correctos cuando isOpen es FALSE', () => {
      useAuth.mockReturnValue({ userRole: 'basico', logout: mockLogout });
      renderWithRouter(<Sidebar isOpen={false} onClose={mockOnClose} />);

      const overlay = document.querySelector('.sidebar-overlay-bg');
      expect(overlay).not.toHaveClass('visible');
      expect(overlay).toHaveAttribute('tabindex', '-1');

      const aside = document.querySelector('.sidebar');
      expect(aside).toHaveClass('closed');
      expect(aside).not.toHaveClass('open');
    });
  });

  it('renderiza enlaces básicos e invoca onClose al hacer clic en ellos', () => {
    useAuth.mockReturnValue({ userRole: 'basico', logout: mockLogout });
    // Añadimos isOpen={true} en los demás tests por buenas prácticas de PropTypes
    renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);

    const inicioLink = screen.getByText('sidebar.home');
    expect(inicioLink).toBeInTheDocument();
    
    fireEvent.click(inicioLink);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    const closeBtn = document.querySelector('.close-menu-btn');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('muestra el enlace de "Cámara" solo a operadores y administradores', () => {
    useAuth.mockReturnValue({ userRole: 'operador', logout: mockLogout });
    const { rerender } = renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('sidebar.camera')).toBeInTheDocument();
    expect(screen.queryByText('sidebar.userManagement')).not.toBeInTheDocument();

    useAuth.mockReturnValue({ userRole: 'espectador', logout: mockLogout });
    rerender(<BrowserRouter><Sidebar isOpen={true} onClose={mockOnClose} /></BrowserRouter>);
    expect(screen.queryByText('sidebar.camera')).not.toBeInTheDocument();
  });

  it('muestra el enlace de "Gestión de Usuarios" exclusivamente a administradores', () => {
    useAuth.mockReturnValue({ userRole: 'admin', logout: mockLogout });
    renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('sidebar.userManagement')).toBeInTheDocument();
    expect(screen.getByText('sidebar.camera')).toBeInTheDocument();
  });

  it('ejecuta logout y cierra el sidebar al pulsar "Cerrar Sesión"', () => {
    useAuth.mockReturnValue({ userRole: 'admin', logout: mockLogout });
    renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);

    const logoutBtn = screen.getByText('sidebar.logout');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe('Gestión de Avatar y Eventos Globales', () => {
    it('carga el avatar por defecto si no hay nada en localStorage', () => {
      useAuth.mockReturnValue({ userRole: 'admin', logout: mockLogout });
      renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);
      
      const avatarImg = document.querySelector('.sidebar-avatar');
      expect(avatarImg).toHaveAttribute('src', '/avatars/robot-fondo-verde.png');
    });

    it('escucha el evento "avatarUpdated" y actualiza la imagen dinámicamente', () => {
      useAuth.mockReturnValue({ userRole: 'admin', logout: mockLogout });
      globalThis.localStorage.setItem('userAvatar', 'old-avatar.png');
      
      const { unmount } = renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />);
      
      const avatarImg = document.querySelector('.sidebar-avatar');
      expect(avatarImg).toHaveAttribute('src', 'old-avatar.png');

      globalThis.localStorage.setItem('userAvatar', 'new-avatar.png');
      act(() => {
        globalThis.dispatchEvent(new Event('avatarUpdated'));
      });

      expect(avatarImg).toHaveAttribute('src', 'new-avatar.png');
      unmount();
    });
  });
});