import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { useAuth } from './hooks/useAuth';

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock the lazy components to speed up tests and avoid act() warnings with suspense
vi.mock('./features/authentication/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('./layout/MainLayout', () => ({ default: () => <div data-testid="main-layout">Main Layout</div> }));
vi.mock('./features/dashboard/Dashboard', () => ({ default: () => <div data-testid="dashboard">Dashboard</div> }));

describe('Componente App y Rutas Protegidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza estado de carga cuando auth está cargando', async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, isLoading: true });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/app']}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Verificando sesión segura...')).toBeInTheDocument();
  });

  it('redirige a login cuando usuario no autenticado intenta acceder a ruta protegida', async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, isLoading: false });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renderiza layout principal cuando usuario accede a ruta protegida', async () => {
    useAuth.mockReturnValue({ isLoggedIn: true, isLoading: false });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <App />
        </MemoryRouter>
      );
    });

    // The MainLayout mock should render
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('redirige ruta raíz a /app', async () => {
    useAuth.mockReturnValue({ isLoggedIn: true, isLoading: false });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );
    });

    // Root -> /app -> /app/dashboard (if we mocked Dashboard inside MainLayout it would be there, but here we just check main layout)
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('redirige ruta desconocida a /app', async () => {
    useAuth.mockReturnValue({ isLoggedIn: true, isLoading: false });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route-123']}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
});
