import React, { useContext } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import httpClient from '../../config/httpClient';
import { AuthProvider, AuthContext } from '../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

vi.mock('../../config/httpClient', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
          eject: vi.fn(),
        }
      }
    }
  }
});

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

const mockNavigate = vi.fn();

const AuthTestComponent = () => {
  const { isLoggedIn, userRole, login, logout } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="auth-status">{isLoggedIn ? 'logged_in' : 'logged_out'}</span>
      <span data-testid="user-role">{userRole || 'none'}</span>
      <button onClick={() => login('User', 'Pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('contexto de autenticación global', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    vi.spyOn(globalThis, 'dispatchEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inicio e inicialización de sesión', () => {
    it('debería iniciar en estado desconectado si no se detecta token local', async () => {
      httpClient.get.mockRejectedValueOnce(new Error('No token'));

      await act(async () => {
        render(
          <AuthProvider>
            <AuthTestComponent />
          </AuthProvider>
        );
      });
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_out');
      expect(httpClient.get).toHaveBeenCalledWith('/auth/verify');
    });

    it('debería cargar el token guardado y validarlo asincrónicamente con la base de datos', async () => {
      globalThis.localStorage.setItem('token', 'fake.jwt.token');
      globalThis.localStorage.setItem('userRole', 'admin');
      httpClient.get.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(
          <AuthProvider>
            <AuthTestComponent />
          </AuthProvider>
        );
      });

      expect(httpClient.get).toHaveBeenCalledWith(expect.stringContaining('/auth/verify'));
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_in');
    });

    it('debería cerrar sesión y limpiar rastros si el backend rechaza el token actual', async () => {
      globalThis.localStorage.setItem('token', 'fake.jwt.token');
      globalThis.localStorage.setItem('userRole', 'admin');
      httpClient.get.mockRejectedValueOnce(new Error('Token expirado'));
      httpClient.post.mockResolvedValueOnce({ data: { success: true } });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await act(async () => {
        render(
          <AuthProvider>
            <AuthTestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(globalThis.localStorage.getItem('userRole')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(screen.getByTestId('auth-status').textContent).toBe('logged_out');
      });
      consoleSpy.mockRestore();
    });
  });

  describe('gestión del proceso de inicio de sesión', () => {


    it('debería limpiar variables conflictivas, propagar eventos globales y permitir acceso', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          user: { 
            role: 'operator', 
            name: 'Andres_Vera<script>', 
            avatar: 'javascript:alert(1)' 
          }
        }
      });

      await act(async () => {
        render(<AuthProvider><AuthTestComponent /></AuthProvider>);
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(globalThis.localStorage.getItem('userRole')).toBe('usuario');
      expect(globalThis.localStorage.getItem('userName')).toBe('User'); 
      expect(globalThis.localStorage.getItem('userAvatar')).toBe('/avatars/robot-fondo-verde.png'); 
      
      expect(globalThis.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_in');
    });

    it('debería extraer y devolver el mensaje de error normalizado proporcionado por la api', async () => {
      httpClient.post.mockRejectedValueOnce({
        response: { data: { error: 'Credenciales inválidas' } }
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let contextRef;
      const AuthCapture = () => {
        contextRef = useContext(AuthContext);
        return null;
      };

      await act(async () => {
        render(<AuthProvider><AuthCapture /></AuthProvider>);
      });

      let result;
      await act(async () => {
        result = await contextRef.login('mal', 'mal');
      });

      expect(result).toEqual({ success: false, message: 'Credenciales inválidas' });
      consoleSpy.mockRestore();
    });
  });

  describe('defensa de ruta vía interceptor', () => {
    it('debería destruir la sesión si cualquier petición ordinaria responde con un código 401', async () => {
      let errorInterceptor;
      httpClient.interceptors.response.use = vi.fn((successCb, errorCb) => {
        errorInterceptor = errorCb;
        return 123; 
      });
      httpClient.interceptors.response.eject = vi.fn();

      const { unmount } = render(<AuthProvider><AuthTestComponent /></AuthProvider>);

      const mockError = {
        response: { status: 401 },
        config: { url: '/api/data' }
      };

      await act(async () => {
        try {
          await errorInterceptor(mockError);
        } catch (error) {
          expect(error).toEqual(mockError);
        }
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login'); 

      // verificamos que ignore peticiones que son nativamente de auth
      mockNavigate.mockClear();
      const mockLoginError = {
        response: { status: 401 },
        config: { url: '/auth/login' }
      };

      await act(async () => {
        try {
          await errorInterceptor(mockLoginError);
        } catch (error) {
          expect(error).toEqual(mockLoginError);
        }
      });

      expect(mockNavigate).not.toHaveBeenCalled(); 

      unmount();
      expect(httpClient.interceptors.response.eject).toHaveBeenCalledWith(123);
    });
  });
});
