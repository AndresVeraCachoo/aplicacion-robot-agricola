import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { authService } from '../../services/authService';
import httpClient from '../../config/httpClient';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    verifySession: vi.fn()
  }
}));

vi.mock('../../config/httpClient', () => ({
  default: {
    interceptors: {
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  }
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ isLoggedIn: false, userRole: null, isLoading: true });
  });

  it('debería iniciar sesión correctamente', async () => {
    authService.login.mockResolvedValue({ user: { role: 'admin' } });

    const result = await useAuthStore.getState().login('user', 'pass');

    expect(authService.login).toHaveBeenCalledWith('user', 'pass');
    expect(localStorage.getItem('userRole')).toBe('admin');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().userRole).toBe('admin');
    expect(result).toEqual({ success: true });
  });

  it('debería fallar el inicio de sesión si el servicio arroja error', async () => {
    authService.login.mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } });

    const result = await useAuthStore.getState().login('user', 'wrong');

    expect(result).toEqual({ success: false, message: 'Invalid credentials' });
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('debería cerrar sesión correctamente', async () => {
    useAuthStore.setState({ isLoggedIn: true, userRole: 'operador' });
    localStorage.setItem('userRole', 'operador');
    authService.logout.mockResolvedValue({});

    await useAuthStore.getState().logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().userRole).toBeNull();
  });

  it('debería inicializar la sesión correctamente si es válida', async () => {
    authService.verifySession.mockResolvedValue({ user: { role: 'admin' } });
    httpClient.interceptors.response.use.mockReturnValue(1);

    const cleanup = await useAuthStore.getState().initAuth();

    expect(httpClient.interceptors.response.use).toHaveBeenCalled();
    expect(localStorage.getItem('userRole')).toBe('admin');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
    
    expect(typeof cleanup).toBe('function');
  });

  it('debería inicializar como no autenticado si la sesión es inválida', async () => {
    authService.verifySession.mockRejectedValue(new Error('Unauthorized'));

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(localStorage.getItem('userRole')).toBeNull();
  });
});
