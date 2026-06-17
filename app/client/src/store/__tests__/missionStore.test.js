import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMissionStore } from '../missionStore';
import axios from 'axios';

vi.mock('axios');

describe('Tienda Global de Misiones (missionStore)', () => {
  let consoleSpy;

  beforeEach(() => {
    useMissionStore.setState({ misiones: [], isLoading: false, error: null });
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const getStore = () => useMissionStore.getState();

  describe('Sincronización (fetchMisiones)', () => {
    it('Debería cargar la colección de misiones e inyectarlas en el estado', async () => {
      const mockData = [{ id: 1, nombre: 'Misión 1' }];
      axios.get.mockResolvedValueOnce({ data: mockData });

      await getStore().fetchMisiones();

      expect(getStore().misiones).toEqual(mockData);
      expect(getStore().isLoading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('Debería extraer el mensaje de error normalizado del servidor si la petición falla', async () => {
      axios.get.mockRejectedValueOnce({ response: { data: { error: "Fallo interno" } } });
      await getStore().fetchMisiones();
      expect(getStore().error).toBe("Fallo interno");
    });
  });

  describe('Creación (createMision)', () => {
    it('Debería instanciar una misión y añadirla al principio de la colección local', async () => {
      useMissionStore.setState({ misiones: [{ id: 2, nombre: 'Vieja' }] });
      axios.post.mockResolvedValueOnce({ data: { id: 1, nombre: 'Nueva' } });

      const result = await getStore().createMision({ nombre: 'Nueva' });

      expect(result).toBe(true);
      expect(getStore().misiones.length).toBe(2);
      expect(getStore().misiones[0].id).toBe(1);
    });

    it('Debería devolver false y registrar en consola si la persistencia falla', async () => {
      axios.post.mockRejectedValueOnce(new Error("Network Error"));
      const result = await getStore().createMision({});
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Modificación (updateMision)', () => {
    it('Debería mapear y sustituir únicamente la misión editada dentro de la colección', async () => {
      useMissionStore.setState({ misiones: [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }] });
      axios.put.mockResolvedValueOnce({ data: { id: 1, nombre: 'Modificada' } });

      const result = await getStore().updateMision(1, {});

      expect(result).toBe(true);
      expect(getStore().misiones[0].nombre).toBe('Modificada');
      expect(getStore().misiones[1].nombre).toBe('B'); 
    });

    it('Debería bloquear la actualización de estado local si el servidor rechaza la edición', async () => {
      axios.put.mockRejectedValueOnce({ response: { data: { error: "Sin permisos" } } });
      const result = await getStore().updateMision(1, {});
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.anything(), "Sin permisos");
    });
  });

  describe('Eliminación (deleteMision)', () => {
    it('Debería extraer la misión eliminada del array local para actualizar la vista', async () => {
      useMissionStore.setState({ misiones: [{ id: 1 }, { id: 2 }] });
      axios.delete.mockResolvedValueOnce({ data: { message: "Ok" } });

      await getStore().deleteMision(1);

      expect(getStore().misiones.length).toBe(1);
      expect(getStore().misiones[0].id).toBe(2);
    });

    it('Debería abortar la eliminación en vista si el servidor retorna error de integridad', async () => {
      useMissionStore.setState({ misiones: [{ id: 1 }] });
      axios.delete.mockRejectedValueOnce(new Error("Integrity Error"));

      await getStore().deleteMision(1);
      expect(getStore().misiones.length).toBe(1); 
    });
  });

  describe('Ejecuciones (startMissionRun)', () => {
    it('Debería enviar la orden de arranque y retornar los metadatos de la ejecución', async () => {
      axios.post.mockResolvedValueOnce({ data: { status: 'started' } });
      const result = await getStore().startMissionRun(1);
      expect(result).toEqual({ status: 'started' });
    });
  });
});