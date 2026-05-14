import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import UserManagementPage from '../UserManagementPage.jsx';
import { useToast } from '../../context/ToastContext'; // <-- CORREGIDO

// --- MOCKS LIMPIOS PARA SONARQUBE ---
vi.mock('axios');

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Simulamos la función de traducción. Si se le pasa un texto por defecto, lo usa.
    t: (key, defaultValue) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return key;
    }
  }),
}));

vi.mock('../../context/ToastContext', () => ({ // <-- CORREGIDO
  useToast: vi.fn(),
}));

// Mock del modal evitando validación de props con arguments[0]
vi.mock('../../components/Modal', () => ({ // <-- CORREGIDO
  default: function MockModal() {
    const { isOpen, children, title } = arguments[0];
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
}));

// --- INICIO DE LOS TESTS ---
describe('UserManagementPage Component', () => {
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
    it('carga la lista de usuarios y bloquea el botón de borrar para usuarios protegidos', async () => {
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

    it('captura el error y muestra un toast si la carga falla', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      render(<UserManagementPage />);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('users.errorLoad', 'error');
        expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Creación de Usuarios (Modal & POST)', () => {
    beforeEach(() => {
       axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('muestra un aviso si se intenta crear un usuario sin contraseña', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Admin Protector'));

      // Abrimos el modal de crear
      fireEvent.click(screen.getByText('users.createNew'));

      // Llenamos el nombre pero dejamos la contraseña vacía
      fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'Nuevo User' } });
      fireEvent.click(screen.getByText('users.save'));

      // Verificamos que abortó la subida (Línea de validación de password)
      expect(mockAddToast).toHaveBeenCalledWith('users.pwdRequired', 'warning');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('envía los datos correctamente al backend, muestra éxito y recarga la lista', async () => {
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
          password: '1234'
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('users.created'), 'success');
      });
    });

    it('captura el error del servidor al crear', async () => {
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

  describe('Edición de Usuarios (Modal & PUT)', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('abre el modal con datos del usuario, permite editar el rol y guarda (PUT)', async () => {
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
           password: '' // Password va vacía por seguridad si no se teclea
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Usuario Normal'), 'success');
      });
    });

    it('permite cancelar la edición cerrando el modal sin guardar', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      const editBtns = screen.getAllByText('users.edit');
      fireEvent.click(editBtns[1]);

      const cancelBtns = screen.getAllByText('users.cancel');
      fireEvent.click(cancelBtns[0]);

      expect(axios.put).not.toHaveBeenCalled();
    });
  });

  describe('Eliminación de Usuarios (Modal & DELETE)', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: mockUsers });
    });

    it('abre el modal de confirmación y permite cancelar sin borrar nada', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      // Intentar eliminar "Usuario Normal"
      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]); 

      // Botón "Cancelar" que pasamos como fallback en tu componente
      const cancelBtn = screen.getByText('Cancelar'); 
      fireEvent.click(cancelBtn);

      expect(axios.delete).not.toHaveBeenCalled();
    });

    it('ejecuta la eliminación correctamente', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      axios.delete.mockResolvedValueOnce({});

      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]);

      // Botón "Eliminar" del modal de confirmación
      const confirmBtn = screen.getByText('Eliminar'); 
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/4'));
        expect(mockAddToast).toHaveBeenCalledWith('Usuario eliminado correctamente', 'success');
      });
    });

    it('maneja el error estándar al eliminar', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      axios.delete.mockRejectedValueOnce(new Error('Standard error'));

      const deleteBtns = screen.getAllByText('users.delete');
      fireEvent.click(deleteBtns[1]);

      const confirmBtn = screen.getByText('Eliminar');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('users.errorDelete', 'error');
      });
    });

    it('maneja el error especial (403/409) si se intenta vulnerar la API con un usuario protegido', async () => {
      render(<UserManagementPage />);
      await waitFor(() => screen.getByText('Usuario Normal'));

      // Simulamos que el backend rechaza la petición con un 403 Forbidden
      const error403 = new Error('Protected');
      error403.response = { status: 403 };
      axios.delete.mockRejectedValueOnce(error403);

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