import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMissionStore } from '../missionStore';

describe('missionStore', () => {
  let consoleSpy;

  beforeEach(() => {
    useMissionStore.setState({ misiones: [], isLoading: false, error: null });
    globalThis.fetch = vi.fn();
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const getStore = () => useMissionStore.getState();

  describe('fetchMisiones', () => {
    it('obtiene las misiones y actualiza el estado', async () => {
      const mockData = [{ id: 1, nombre: 'Misión 1' }];
      globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });

      await getStore().fetchMisiones();

      expect(getStore().misiones).toEqual(mockData);
      expect(getStore().isLoading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('rama !response.ok: maneja el error si falla la petición', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: false });
      await getStore().fetchMisiones();
      expect(getStore().error).toBe('Error al obtener las misiones');
    });
  });

  describe('createMision', () => {
    it('crea una misión y la añade al array', async () => {
      useMissionStore.setState({ misiones: [{ id: 2, nombre: 'Vieja' }] });
      globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, nombre: 'Nueva' }) });

      const result = await getStore().createMision({ nombre: 'Nueva' });

      expect(result).toBe(true);
      expect(getStore().misiones.length).toBe(2);
      expect(getStore().misiones[0].id).toBe(1);
    });

    it('rama !response.ok: devuelve false y captura el error si la creación falla', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: false });
      const result = await getStore().createMision({});
      expect(result).toBe(false);
    });
  });

  describe('updateMision', () => {
    it('actualiza una misión existente (cubre m.id === id y m.id !== id)', async () => {
      useMissionStore.setState({ misiones: [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }] });
      globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, nombre: 'Modificada' }) });

      const result = await getStore().updateMision(1, {});

      expect(result).toBe(true);
      expect(getStore().misiones[0].nombre).toBe('Modificada');
      expect(getStore().misiones[1].nombre).toBe('B'); // Rama m.id !== id
    });

    it('rama !response.ok: devuelve false y muestra error', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const result = await getStore().updateMision(1, {});
      expect(result).toBe(false);
    });
  });

  describe('deleteMision', () => {
    it('elimina la misión (cubre m.id !== id y m.id === id)', async () => {
      useMissionStore.setState({ misiones: [{ id: 1 }, { id: 2 }] });
      globalThis.fetch.mockResolvedValueOnce({ ok: true });

      await getStore().deleteMision(1);

      expect(getStore().misiones.length).toBe(1);
      expect(getStore().misiones[0].id).toBe(2);
    });

    it('rama !response.ok: captura el error si falla la eliminación', async () => {
      useMissionStore.setState({ misiones: [{ id: 1 }] });
      globalThis.fetch.mockResolvedValueOnce({ ok: false });

      await getStore().deleteMision(1);
      expect(getStore().misiones.length).toBe(1); 
    });
  });

  describe('startMissionRun', () => {
    it('inicia la ejecución y devuelve el JSON', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'started' }) });
      const result = await getStore().startMissionRun(1);
      expect(result).toEqual({ status: 'started' });
    });

    it('rama !response.ok: devuelve null', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: false });
      const result = await getStore().startMissionRun(1);
      expect(result).toBeNull();
    });
  });
});