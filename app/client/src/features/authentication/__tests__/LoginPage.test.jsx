import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../LoginPage.jsx';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { useTranslation } from 'react-i18next';

// 1. Mocks de hooks personalizados y librerías
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();
  const mockChangeLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Comportamiento por defecto de los mocks para la mayoría de tests
    useAuth.mockReturnValue({ login: mockLogin });
    useTranslation.mockReturnValue({
      t: (key) => key, // Devolvemos la clave de traducción directamente
      i18n: {
        resolvedLanguage: 'es',
        language: 'es',
        changeLanguage: mockChangeLanguage,
      },
    });
  });

  it('renderiza el formulario de login y los campos correctamente', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('login.welcome')).toBeInTheDocument();
    expect(screen.getByLabelText('login.username')).toBeInTheDocument();
    expect(screen.getByLabelText('login.pwdText')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
  });

  it('muestra un error si se intenta enviar el formulario con campos vacíos', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: 'login.submit' });
    
    // Disparamos el submit sin rellenar nada
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText('login.errorRequired')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('muestra un error si las credenciales son inválidas (login devuelve success: false)', async () => {
    // Simulamos un fallo en la autenticación
    mockLogin.mockResolvedValueOnce({ success: false });
    render(<LoginPage />);

    const nameInput = screen.getByLabelText('login.username');
    const pwdInput = screen.getByLabelText('login.pwdText');
    const submitButton = screen.getByRole('button', { name: 'login.submit' });

    fireEvent.change(nameInput, { target: { value: 'usuario_mal' } });
    fireEvent.change(pwdInput, { target: { value: 'clave_mal' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockLogin).toHaveBeenCalledWith('usuario_mal', 'clave_mal');
    expect(screen.getByText('login.invalidCreds')).toBeInTheDocument();
  });

  it('envía el formulario correctamente y no muestra errores si el login es exitoso', async () => {
    // Simulamos éxito en la autenticación
    mockLogin.mockResolvedValueOnce({ success: true });
    render(<LoginPage />);

    const nameInput = screen.getByLabelText('login.username');
    const pwdInput = screen.getByLabelText('login.pwdText');
    const submitButton = screen.getByRole('button', { name: 'login.submit' });

    fireEvent.change(nameInput, { target: { value: 'admin' } });
    fireEvent.change(pwdInput, { target: { value: '1234' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockLogin).toHaveBeenCalledWith('admin', '1234');
    expect(screen.queryByText('login.invalidCreds')).not.toBeInTheDocument();
    expect(screen.queryByText('login.errorRequired')).not.toBeInTheDocument();
  });

  describe('Selector de Idiomas', () => {
    it('abre el menú desplegable y permite cambiar el idioma', () => {
      render(<LoginPage />);
      
      const langButton = screen.getByRole('button', { name: 'ES' });
      
      // Abrimos el dropdown
      act(() => { fireEvent.click(langButton); });
      
      // Verificamos que las otras opciones (EN, PT) están renderizadas
      const enOption = screen.getByRole('button', { name: 'EN' });
      const ptOption = screen.getByRole('button', { name: 'PT' });
      expect(enOption).toBeInTheDocument();
      expect(ptOption).toBeInTheDocument();

      // Cambiamos el idioma a Inglés
      act(() => { fireEvent.click(enOption); });

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
      // Verificamos que el dropdown se ha cerrado
      expect(screen.queryByRole('button', { name: 'EN' })).not.toBeInTheDocument();
    });

    it('usa el idioma por defecto (ES) si i18n no tiene ningún idioma resuelto', () => {
      // Modificamos el mock para forzar la rama del fallback de idioma
      useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          resolvedLanguage: null,
          language: null, 
          changeLanguage: mockChangeLanguage,
        },
      });

      render(<LoginPage />);
      // Si es null, debe caer en "es" que es el primero por el .startsWith()
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });

    it('usa el primer idioma del array si el idioma detectado no está soportado', () => {
      useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          resolvedLanguage: 'fr', // Francés no está en LANGUAGES
          changeLanguage: mockChangeLanguage,
        },
      });

      render(<LoginPage />);
      // Al fallar el find(), debe hacer fallback a LANGUAGES[0] que es "ES"
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });
  });
});