import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import UserManagementPage from '../UserManagementPage.jsx';
import { useToast } from '../../context/ToastContext';



vi.mock('axios');

const mockT = (key, defaultValue) => {
  if (typeof defaultValue === 'string') return defaultValue;
  return key;
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

// Mock del modal evitando validación de props con arguments[0]
vi.mock('../../components/Modal', () => ({
  default: function MockModal({ isOpen, children, title }) {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
}));


describe('Componente UserManagementPage', () => {
  let mockAddToast;
  let consoleSpy;

  const mockUsers = [
    { id: '1', name: 'Admin Protector', role: 'admin' }, // Usuario Protegido
    { id: '4', name: 'Usuario Normal', role: 'usuario' }  // Usuario Normal
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast = vi.fn();
    useToast.mockReturnValue({ addToast: mockAddToast });
    
    // Silenciamos los errores de consola esperados en los tests de error
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Carga y Listado de Usuarios', () => {
    it('carga lista de usuarios y bloquea botón eliminar para protegidos', async () => {
      axios.get.mockResolvedValueOnce({ data: mockUsers });
      render(<UserManagementPage />);

      await waitFor(() => {
         expect(screen.getByText('Admin Protector')).toBeInTheDocument();
         expect(screen.getByText('Usuario Normal')).toBeInTheDocument();
      });

      // Validamos la protección de usuarios de sistema (Líneas del `disabled={['1', '2', '3']...}`)
      const deleteBtns = screen.getAllByText('users.delete');
      expect(deleteBtns[0]).toBeDisabled(); // ID 1 (Deshabilitado)
      expect(deleteBtns[1]).not.toBeDisabled(); // ID 4 (Habilitado)
    });

    it('captura error y muestra un toast si falla la carga', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      render(<UserManagementPage />);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('users.errorLoad', 'error');
        expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Creación de Usuario', () => {
    beforeEach(() => {
       axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('muestra advertencia si intenta crear usuario sin contraseña', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Admin Protector'));

      // Abrimos el modal de crear
      fireEvent.click(screen.getByText('users.createNew'));

      // Llenamos el nombre pero dejamos la contraseña vacía
      fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'Nuevo User' } });
      fireEvent.click(screen.getByText('users.save'));

      // Verificamos que abortó la subida (Línea de validación de password)
      expect(mockAddToast).toHaveBeenCalledWith('Debe proporcionar una contraseña o un email válido', 'warning');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('envía datos al backend, muestra éxito y recarga lista', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Admin Protector'));

      axios.post.mockResolvedValueOnce({});
      
      fireEvent.click(screen.getByText('users.createNew'));

      // Rellenamos nombre y contraseña
      fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'Nuevo User' } });
      fireEvent.change(document.querySelector('input[name="password"]'), { target: { name: 'password', value: '1234' } });

      fireEvent.click(screen.getByText('users.save'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          name: 'Nuevo User',
          role: 'usuario',
          password: '1234',
          email: undefined
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('users.created'), 'success');
      });
    });

    it('captura error del servidor en la creación', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Admin Protector'));

      axios.post.mockRejectedValueOnce(new Error('API error'));

      fireEvent.click(screen.getByText('users.createNew'));
      fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'Fallo' } });
      fireEvent.change(document.querySelector('input[name="password"]'), { target: { name: 'password', value: '123' } });

      fireEvent.click(screen.getByText('users.save'));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('users.errorSave', 'error');
      });
    });
  });

  describe('Edición de Usuario', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('abre modal con datos de usuario, permite editar rol y guarda', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      axios.put.mockResolvedValueOnce({});

      // Hacemos click en Editar del "Usuario Normal"
      const editBtns = screen.getAllByText('users.edit');
      fireEvent.click(editBtns[1]); 

      // Cambiamos el rol a Admin
      const roleSelect = document.querySelector('select[name="role"]');
      fireEvent.change(roleSelect, { target: { name: 'role', value: 'admin' } });

      fireEvent.click(screen.getByText('users.save'));

      await waitFor(() => {
        // En la edición, comprueba que manda el PUT a la ID correspondiente
        expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/4'), {
           name: 'Usuario Normal',
           role: 'admin',
           password: undefined,
           email: undefined
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Usuario Normal'), 'success');
      });
    });

    it('permite cancelar edición cerrando modal sin guardar', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      const editBtns = screen.getAllByText('users.edit');
      fireEvent.click(editBtns[1]);

      const cancelBtns = screen.getAllByText('users.cancel');
      fireEvent.click(cancelBtns[0]);

      expect(axios.put).not.toHaveBeenCalled();
    });
  });

  describe('Borrado de Usuario', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('abre confirmación modal y permite cancelar sin borrar', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      // Intentar eliminar "Usuario Normal"
      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]); 

      // Botón "Cancelar" que pasamos como fallback en tu componente
      const cancelBtns = screen.getAllByText('Cancelar'); 
      fireEvent.click(cancelBtns[0]);

      expect(axios.delete).not.toHaveBeenCalled();
    });

    it('ejecuta borrado correctamente', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      axios.delete.mockResolvedValueOnce({});

      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]);

      // Botón "Eliminar" del modal de confirmación
      const confirmBtn = screen.getByText('Eliminar');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/users/4'));
        expect(mockAddToast).toHaveBeenCalledWith('Usuario eliminado correctamente', 'success');
      });
    });

    it('maneja error estándar al borrar', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      axios.delete.mockRejectedValue(new Error('Standard error'));

      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]);

      const confirmBtn = screen.getByText('Eliminar');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('users.errorDelete', 'error');
      });
    });

    it('maneja error especial si intenta vulnerar API con usuario protegido', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      const error403 = new Error('Protected');
      error403.response = { status: 403 };
      axios.delete.mockRejectedValue(error403);

      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]);

      const confirmBtn = screen.getByText('Eliminar');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('No puedes eliminar a los usuarios predeterminados del sistema', 'error');
      });
    });
  });
});
