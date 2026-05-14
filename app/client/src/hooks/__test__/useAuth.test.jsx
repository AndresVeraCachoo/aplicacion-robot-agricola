import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../useAuth';
import { AuthContext } from '../../context/AuthContext';

describe('useAuth Hook', () => {
  it('debe lanzar un error si se usa fuera de un AuthProvider', () => {
    // Silenciamos el error de consola de React que ocurre al lanzar errores intencionados en el renderizado
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth() debe ser usado dentro de un AuthProvider'
    );

    consoleSpy.mockRestore();
  });

  it('debe devolver el contexto de autenticación cuando se usa dentro de un AuthProvider', () => {
    const mockAuthValue = {
      isLoggedIn: true,
      userRole: 'admin',
      login: vi.fn(),
      logout: vi.fn(),
    };

    // Creamos un wrapper que simula el Provider pasando el valor mockeado
    const wrapper = ({ children }) => (
      <AuthContext.Provider value={mockAuthValue}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Verificamos que los valores devueltos por el hook son los del contexto
    expect(result.current).toEqual(mockAuthValue);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.userRole).toBe('admin');
  });
});