import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { useAuthStore } from './store/authStore';

vi.mock('./store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('./pages/Login/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('./layout/MainLayout', () => ({ default: () => <div data-testid="main-layout">Main Layout</div> }));
vi.mock('./pages/Dashboard/DashboardPage', () => ({ default: () => <div data-testid="dashboard">Dashboard</div> }));
vi.mock('./pages/Camera/CameraPage', () => ({ default: () => <div data-testid="camera-page">Camera Page</div> }));
vi.mock('./pages/Control/ControlPage', () => ({ default: () => <div data-testid="control-page">Control Page</div> }));
vi.mock('./pages/Data/DataPage', () => ({ default: () => <div data-testid="data-page">Data Page</div> }));
vi.mock('./pages/Energy/EnergyPage', () => ({ default: () => <div data-testid="energy-page">Energy Page</div> }));
vi.mock('./pages/Missions/MissionsPage', () => ({ default: () => <div data-testid="missions-page">Missions Page</div> }));
vi.mock('./pages/Profile/ProfilePage', () => ({ default: () => <div data-testid="profile-page">Profile Page</div> }));
vi.mock('./pages/UserManagement/UserManagementPage', () => ({ default: () => <div data-testid="user-management-page">User Management Page</div> }));

describe('Componente App y Rutas Protegidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza estado de carga cuando auth está cargando', async () => {
    useAuthStore.mockReturnValue({ isLoggedIn: false, isLoading: true, initAuth: vi.fn(() => Promise.resolve(() => {})) });

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
    useAuthStore.mockReturnValue({ isLoggedIn: false, isLoading: false, initAuth: vi.fn(() => Promise.resolve(() => {})) });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it.each([
    ['/app/dashboard'],
    ['/'],
    ['/unknown-route-123'],
  ])('renderiza layout principal al acceder a la ruta %s con usuario autenticado', async (route) => {
    useAuthStore.mockReturnValue({ isLoggedIn: true, isLoading: false, initAuth: vi.fn(() => Promise.resolve(() => {})) });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
});