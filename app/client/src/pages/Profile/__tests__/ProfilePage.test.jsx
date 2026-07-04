import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import ProfilePage from '../ProfilePage.jsx';

// --- MOCKS ---
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

vi.mock('axios');

const mockT = (k) => k; 
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}));

describe('Componente ProfilePage', () => {
  let consoleSpy;
  let dispatchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage.clear();
    queryClient.clear();
    
    // Espiamos los errores de consola para mantener la terminal limpia
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Espiamos el disparo de eventos globales (para el avatarUpdated)
    dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  describe('Carga Inicial de Perfil', () => {
    it('obtiene datos de perfil y los muestra correctamente', async () => {
      axios.get.mockResolvedValueOnce({
        data: { name: 'Admin Test', role: 'admin', avatar: '/test-avatar.png' }
      });

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/users/profile'));
        expect(screen.getByText('Admin Test')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });

      // Verificamos que actualizó el localStorage y disparó el evento
      expect(globalThis.localStorage.getItem('userAvatar')).toBe('/test-avatar.png');
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
      expect(dispatchSpy.mock.calls[0][0].type).toBe('avatarUpdated');
    });

    it('cubre rama donde el perfil no devuelve avatar personalizado', async () => {
      axios.get.mockResolvedValueOnce({
        data: { name: 'Operador', role: 'operador' }
      });

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Operador')).toBeInTheDocument();
      });
      
      // Si no hay avatar en la respuesta, NO debe actualizar el localStorage
      expect(globalThis.localStorage.getItem('userAvatar')).toBeNull();
    });

    it('maneja correctamente errores de servidor al cargar perfil', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('profile.errorLoadProfile')).toBeInTheDocument();
        // expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Selector y Cambio de Avatar', () => {
    beforeEach(() => {
      // Mockeamos la carga inicial (GET) siempre en verde para este bloque
      axios.get.mockResolvedValue({ data: { name: 'Test', role: 'test' } });
    });

    it('abre panel, permite seleccionar un avatar y cancelar', async () => {
      renderWithProviders(<ProfilePage />);
      
      // Esperamos a que la carga inicial se resuelva
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      // Abrir selector
      const toggleBtn = screen.getByText('profile.changePhotoBtn');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('users.cancel')).toBeInTheDocument();

      // Clic en la segunda opción de avatar
      const avatarOptions = document.querySelectorAll('.avatar-option-btn');
      fireEvent.click(avatarOptions[1]);
      
      expect(avatarOptions[1]).toHaveClass('active');

      // Cerrar selector
      fireEvent.click(screen.getByText('users.cancel'));
      expect(document.querySelector('.avatar-selector-panel')).toBeNull();
    });

    it('guarda avatar correctamente, actualiza localStorage y dispara evento', async () => {
      axios.put.mockResolvedValueOnce({
        data: { user: { avatar: '/avatars/robot-fondo-azul.png' } }
      });

      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      fireEvent.click(screen.getByText('profile.changePhotoBtn'));
      
      // Intentamos guardar SIN seleccionar nada (Retorno temprano)
      const saveBtn = screen.getByText('profile.updateButton');
      fireEvent.click(saveBtn);
      expect(axios.put).not.toHaveBeenCalled();

      // Seleccionamos un avatar y guardamos
      const avatarOptions = document.querySelectorAll('.avatar-option-btn');
      fireEvent.click(avatarOptions[2]); 
      fireEvent.click(saveBtn); 

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/users/profile/avatar'), 
          { avatarUrl: expect.any(String) }
        );
        expect(screen.getByText('profile.avatarSuccess')).toBeInTheDocument();
      });

      expect(globalThis.localStorage.getItem('userAvatar')).toBe('/avatars/robot-fondo-azul.png');
      expect(document.querySelector('.avatar-selector-panel')).toBeNull();
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('maneja correctamente errores al guardar avatar', async () => {
      axios.put.mockRejectedValueOnce(new Error('Avatar Update Failed'));

      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      fireEvent.click(screen.getByText('profile.changePhotoBtn'));
      const avatarOptions = document.querySelectorAll('.avatar-option-btn');
      fireEvent.click(avatarOptions[0]); 
      
      fireEvent.click(screen.getByText('profile.updateButton'));

      await waitFor(() => {
        expect(screen.getByText('profile.errorServer')).toBeInTheDocument();
        // expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Actualización de Contraseña', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { name: 'Test', role: 'test' } });
    });

    it('actualiza campos del formulario al escribir', async () => {
      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      // SOLUCIÓN: Buscamos el input por su atributo "name" en el DOM real
      const currentInput = document.querySelector('input[name="currentPassword"]');
      fireEvent.change(currentInput, { target: { name: 'currentPassword', value: '123' } });
      
      expect(currentInput.value).toBe('123');
    });

    it('muestra error si las nuevas contraseñas no coinciden', async () => {
      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      fireEvent.change(document.querySelector('input[name="currentPassword"]'), { target: { name: 'currentPassword', value: 'oldpass' } });
      fireEvent.change(document.querySelector('input[name="newPassword"]'), { target: { name: 'newPassword', value: 'newpass' } });
      fireEvent.change(document.querySelector('input[name="confirmPassword"]'), { target: { name: 'confirmPassword', value: 'different' } });

      fireEvent.click(screen.getByText('profile.updatePassword'));

      expect(axios.put).not.toHaveBeenCalled();
      expect(screen.getByText('profile.errorMismatch')).toBeInTheDocument();
    });

    it('envía solicitud con éxito, muestra mensaje y limpia formulario', async () => {
      axios.put.mockResolvedValueOnce({}); // Responde OK

      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      const currentInput = document.querySelector('input[name="currentPassword"]');
      const newInput = document.querySelector('input[name="newPassword"]');
      const confirmInput = document.querySelector('input[name="confirmPassword"]');

      fireEvent.change(currentInput, { target: { name: 'currentPassword', value: 'oldpass' } });
      fireEvent.change(newInput, { target: { name: 'newPassword', value: 'newpass' } });
      fireEvent.change(confirmInput, { target: { name: 'confirmPassword', value: 'newpass' } });

      fireEvent.click(screen.getByText('profile.updatePassword'));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/users/profile/password'),
          { currentPassword: 'oldpass', newPassword: 'newpass' }
        );
        expect(screen.getByText('profile.successUpdate')).toBeInTheDocument();
      });

      expect(currentInput.value).toBe('');
      expect(newInput.value).toBe('');
      expect(confirmInput.value).toBe('');
    });

    it('captura error de servidor si la contraseña antigua es incorrecta', async () => {
      axios.put.mockRejectedValueOnce(new Error('Wrong password'));

      renderWithProviders(<ProfilePage />);
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
      
      fireEvent.change(document.querySelector('input[name="currentPassword"]'), { target: { name: 'currentPassword', value: 'wrongpass' } });
      fireEvent.change(document.querySelector('input[name="newPassword"]'), { target: { name: 'newPassword', value: 'newpass' } });
      fireEvent.change(document.querySelector('input[name="confirmPassword"]'), { target: { name: 'confirmPassword', value: 'newpass' } });

      fireEvent.click(screen.getByText('profile.updatePassword'));

      await waitFor(() => {
        expect(screen.getByText('profile.errorServer')).toBeInTheDocument();
        // expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });
});
