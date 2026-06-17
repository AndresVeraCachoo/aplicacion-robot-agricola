import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { AuthProvider, AuthContext } from '../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

vi.mock('axios');
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

describe('contexto global de autenticación', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    axios.defaults = { headers: { common: {} } };
    vi.spyOn(globalThis, 'dispatchEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('arranque e inicialización de la sesión', () => {
    it('debería iniciar en estado desconectado si no detecta token local', async () => {
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_out');
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('debería cargar el token guardado y validarlo asíncronamente con la base de datos', async () => {
      globalThis.localStorage.setItem('token', 'fake.jwt.token');
      globalThis.localStorage.setItem('userRole', 'admin');
      axios.get.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(
          <AuthProvider>
            <AuthTestComponent />
          </AuthProvider>
        );
      });

      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer fake.jwt.token');
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/auth/verify'));
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_in');
    });

    it('debería desloguear y limpiar rastros si el backend rechaza el token actual', async () => {
      globalThis.localStorage.setItem('token', 'fake.jwt.token');
      axios.get.mockRejectedValueOnce(new Error('Token expirado'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await act(async () => {
        render(
          <AuthProvider>
            <AuthTestComponent />
          </AuthProvider>
        );
      });

      expect(globalThis.localStorage.getItem('token')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_out');
      consoleSpy.mockRestore();
    });
  });

  describe('gestión del proceso de inicio de sesión', () => {
    it('debería bloquear el login y alertar si la firma jwt no cumple con el estándar', async () => {
      axios.post.mockResolvedValueOnce({
        data: { token: 'token_invalido_sin_puntos', user: { name: 'Test' } }
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        render(<AuthProvider><AuthTestComponent /></AuthProvider>);
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      expect(globalThis.localStorage.getItem('token')).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('debería sanitizar variables conflictivas, propagar eventos globales y permitir el acceso', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          token: 'header.payload.signature', 
          user: { 
            role: 'operador', 
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

      expect(globalThis.localStorage.getItem('token')).toBe('header.payload.signature');
      expect(globalThis.localStorage.getItem('userRole')).toBe('operador');
      expect(globalThis.localStorage.getItem('userName')).toBe('Usuario'); 
      expect(globalThis.localStorage.getItem('userAvatar')).toBe('/avatars/robot-fondo-verde.png'); 
      
      expect(globalThis.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_in');
    });

    it('debería extraer y devolver el mensaje de error normalizado provisto por la api', async () => {
      axios.post.mockRejectedValueOnce({
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

  describe('defensa de rutas mediante interceptor', () => {
    it('debería destruir la sesión si cualquier petición ordinaria responde con código 401', async () => {
      let errorInterceptor;
      axios.interceptors.response.use = vi.fn((successCb, errorCb) => {
        errorInterceptor = errorCb;
        return 123; 
      });
      axios.interceptors.response.eject = vi.fn();

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
      expect(axios.interceptors.response.eject).toHaveBeenCalledWith(123);
    });
  });
});