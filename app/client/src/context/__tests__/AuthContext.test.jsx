import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { AuthProvider, AuthContext } from '../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

// 1. Mocks de dependencias externas
vi.mock('axios');
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

const mockNavigate = vi.fn();

// Componente para interactuar con el contexto
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

describe('AuthContext', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    axios.defaults = { headers: { common: {} } };
    // Interceptamos eventos globales
    vi.spyOn(globalThis, 'dispatchEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialización y Verificación (Centinela)', () => {
    it('inicia desconectado si no hay token', async () => {
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_out');
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('verifica el token al montar si existe en localStorage', async () => {
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

    it('hace logout automático si la verificación falla', async () => {
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

  describe('Función de Login y Sanitización', () => {
    it('falla y lanza error si el JWT es inválido (seguridad)', async () => {
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

    it('realiza login exitoso, sanitiza roles, nombres, avatares y navega a dashboard', async () => {
      // Mock de una respuesta exitosa con datos "sucios" para probar sanitización
      axios.post.mockResolvedValueOnce({
        data: {
          token: 'header.payload.signature', // Formato válido
          user: { 
            role: 'operador', 
            name: 'Andres_Vera<script>', // Nombre con caracteres no permitidos
            avatar: 'javascript:alert(1)' // URL maliciosa
          }
        }
      });

      await act(async () => {
        render(<AuthProvider><AuthTestComponent /></AuthProvider>);
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      // Verificamos sanitizaciones
      expect(globalThis.localStorage.getItem('token')).toBe('header.payload.signature');
      expect(globalThis.localStorage.getItem('userRole')).toBe('operador');
      expect(globalThis.localStorage.getItem('userName')).toBe('Usuario'); // Fallback seguro
      expect(globalThis.localStorage.getItem('userAvatar')).toBe('/avatars/robot-fondo-verde.png'); // Fallback seguro
      
      expect(globalThis.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
      expect(screen.getByTestId('auth-status').textContent).toBe('logged_in');
    });

    it('devuelve mensaje de error si el login de axios falla', async () => {
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

  describe('Interceptor de Axios', () => {
    it('configura y ejecuta el interceptor, deslogueando en 401 si no es ruta de auth', async () => {
      // Para probar el interceptor, extraemos las funciones de callback registradas por el hook
      let errorInterceptor;
      axios.interceptors.response.use = vi.fn((successCb, errorCb) => {
        errorInterceptor = errorCb;
        return 123; // mock interceptor ID
      });
      axios.interceptors.response.eject = vi.fn();

      const { unmount } = render(<AuthProvider><AuthTestComponent /></AuthProvider>);

      // Simulamos un error 401 en una ruta protegida
      const mockError = {
        response: { status: 401 },
        config: { url: '/api/data' }
      };

      await act(async () => {
        try {
          await errorInterceptor(mockError);
        } catch (error) {
          // Aseguramos que el error es propagado correctamente por el interceptor
          expect(error).toEqual(mockError);
        }
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login'); // El logout fue ejecutado

      // Probamos que el interceptor deja pasar los errores 401 de /auth/login sin desloguear (bucle)
      mockNavigate.mockClear();
      const mockLoginError = {
        response: { status: 401 },
        config: { url: '/auth/login' }
      };

      await act(async () => {
        try {
          await errorInterceptor(mockLoginError);
        } catch (error) {
          // Aseguramos que el error es propagado correctamente
          expect(error).toEqual(mockLoginError);
        }
      });

      expect(mockNavigate).not.toHaveBeenCalled(); // No debe ejecutar logout

      // Probamos cleanup
      unmount();
      expect(axios.interceptors.response.eject).toHaveBeenCalledWith(123);
    });
  });
});