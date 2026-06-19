import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../LoginPage.jsx';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { useTranslation } from 'react-i18next';

// 1. Mocks of custom hooks and libraries
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

describe('Componente LoginPage', () => {
  const mockLogin = vi.fn();
  const mockChangeLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior for most tests
    useAuth.mockReturnValue({ login: mockLogin });
    useTranslation.mockReturnValue({
      t: (key) => key, // Return the translation key directly
      i18n: {
        resolvedLanguage: 'es',
        language: 'es',
        changeLanguage: mockChangeLanguage,
      },
    });
  });

  it('renderiza el formulario de login y campos correctamente', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('login.welcome')).toBeInTheDocument();
    expect(screen.getByLabelText('login.username')).toBeInTheDocument();
    expect(screen.getByLabelText('login.pwdText')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
  });

  it('muestra un error si se intenta enviar formulario con campos vacíos', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: 'login.submit' });
    
    // Trigger submit without filling anything
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText('login.errorRequired')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('muestra un error si credenciales son inválidas', async () => {
    // Simulate authentication failure
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

  it('envía el formulario correctamente y no muestra errores si el inicio de sesión es exitoso', async () => {
    // Simulate authentication success
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

  describe('Selector de Idioma', () => {
    it('abre el menú desplegable y permite cambiar el idioma', () => {
      render(<LoginPage />);
      
      const langButton = screen.getByRole('button', { name: 'ES' });
      
      // Open the dropdown
      act(() => { fireEvent.click(langButton); });
      
      // Verify that the other options (EN, PT) are rendered
      const enOption = screen.getByRole('button', { name: 'EN' });
      const ptOption = screen.getByRole('button', { name: 'PT' });
      expect(enOption).toBeInTheDocument();
      expect(ptOption).toBeInTheDocument();

      // Change language to English
      act(() => { fireEvent.click(enOption); });

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
      // Verify that the dropdown has been closed
      expect(screen.queryByRole('button', { name: 'EN' })).not.toBeInTheDocument();
    });

    it('usa el idioma por defecto (ES) si i18n no tiene idioma resuelto', () => {
      // Modify the mock to force the language fallback branch
      useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          resolvedLanguage: null,
          language: null, 
          changeLanguage: mockChangeLanguage,
        },
      });

      render(<LoginPage />);
      // If it is null, it should fall back to "es" which is the first one via .startsWith()
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });

    it('usa el primer idioma en el arreglo si el detectado no está soportado', () => {
      useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: {
          resolvedLanguage: 'fr', // French is not in LANGUAGES
          changeLanguage: mockChangeLanguage,
        },
      });

      render(<LoginPage />);
      // Since find() fails, it should fallback to LANGUAGES[0] which is "ES"
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });
  });
});
