import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMissionStore } from '../missionStore';
import axios from 'axios';

vi.mock('axios');

describe('Store Global de Misiones', () => {
  let consoleSpy;

  beforeEach(() => {
    useMissionStore.setState({ missions: [], isLoading: false, error: null });
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const getStore = () => useMissionStore.getState();

  describe('Sincronización de Misiones', () => {
    it('debería cargar colección de misiones e inyectarlas en el estado', async () => {
      const mockData = [{ id: 1, nombre: 'Misión 1' }];
      axios.get.mockResolvedValueOnce({ data: mockData });

      await getStore().fetchMissions();

      expect(getStore().missions).toEqual(mockData);
      expect(getStore().isLoading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('debería extraer mensaje de error normalizado si falla solicitud', async () => {
      axios.get.mockRejectedValueOnce(new Error("Fallo interno"));
      await getStore().fetchMissions();
      expect(getStore().error).toBe("Fallo interno");
    });
  });

  describe('Creación de Misiones', () => {
    it('debería instanciar misión y añadirla a la colección local', async () => {
      useMissionStore.setState({ missions: [{ id: 2, name: 'Vieja' }] });
      axios.post.mockResolvedValueOnce({ data: { id: 1, nombre: 'Nueva' } });

      const result = await getStore().createMission({ nombre: 'Nueva' });

      expect(result).toBe(true);
      expect(getStore().missions.length).toBe(2);
      expect(getStore().missions[0].id).toBe(1);
    });

    it('debería retornar falso y registrar error en consola si falla persistencia', async () => {
      axios.post.mockRejectedValueOnce(new Error("Network Error"));
      const result = await getStore().createMission({});
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Modificación de Misión', () => {
    it('debería mapear y reemplazar solo la misión editada', async () => {
      useMissionStore.setState({ missions: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] });
      axios.put.mockResolvedValueOnce({ data: { id: 1, name: 'Modificada' } });

      const result = await getStore().updateMission(1, {});

      expect(result).toBe(true);
      expect(getStore().missions[0].name).toBe('Modificada');
      expect(getStore().missions[1].name).toBe('B'); 
    });

    it('debería bloquear actualización local si servidor rechaza edición', async () => {
      axios.put.mockRejectedValueOnce({ response: { data: { error: "Sin permisos" } } });
      const result = await getStore().updateMission(1, {});
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Error al actualizar la misión en el store:", expect.anything());
    });
  });

  describe('Borrado de Misión', () => {
    it('debería remover misión borrada del arreglo local para actualizar vista', async () => {
      useMissionStore.setState({ missions: [{ id: 1 }, { id: 2 }] });
      axios.delete.mockResolvedValueOnce({ data: { message: "Ok" } });

      await getStore().deleteMission(1);

      expect(getStore().missions.length).toBe(1);
      expect(getStore().missions[0].id).toBe(2);
    });

    it('debería abortar borrado de vista si servidor retorna error de integridad', async () => {
      useMissionStore.setState({ missions: [{ id: 1 }] });
      axios.delete.mockRejectedValueOnce(new Error("Integrity Error"));

      await getStore().deleteMission(1);
      expect(getStore().missions.length).toBe(1); 
    });
  });

  describe('Ejecuciones de Misión', () => {
    it('debería enviar comando de inicio y retornar metadatos de ejecución', async () => {
      axios.post.mockResolvedValueOnce({ data: { status: 'started' } });
      const result = await getStore().startMissionRun(1);
      expect(result).toEqual({ status: 'started' });
    });
  });
});
