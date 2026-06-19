import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRobotStore } from '../robotStore';
import axios from 'axios';
import { io } from 'socket.io-client';

vi.mock('axios');
vi.mock('socket.io-client', () => ({ io: vi.fn() }));

describe('Store Global de Robot', () => {
  let mockSocket;
  let socketCallbacks = {};
  let consoleSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    socketCallbacks = {};
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSocket = {
      on: vi.fn((event, cb) => { socketCallbacks[event] = cb; }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
    };

    io.mockReturnValue(mockSocket);
    globalThis.localStorage.clear();

    useRobotStore.setState({
      socket: null,
      isConnected: false,
      isSidebarOpen: true, 
      safeZone: null,
      system: { mode: 'AUTO', status: 'IDLE', speedLimit: 50, heading: 0 },
      battery: { percentage: 0, solarInput: 0, consumption: 0, netPower: 0, voltage: 0, temperature: 0, timeRemaining: "" },
      position: { lat: 40, lon: -3 },
      navTarget: null,
      navQueue: [],
      agronomicData: [],
      pathHistory: [],
      deletedSessionKeys: [],
      totalMissionPoints: 0
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const getStore = () => useRobotStore.getState();

  describe('Visual State and Interface Management', () => {
    it('debería alternar y establecer el estado de visibilidad de Sidebar', () => {
      getStore().setSidebarOpen(false);
      expect(getStore().isSidebarOpen).toBe(false);

      getStore().toggleSidebar();
      expect(getStore().isSidebarOpen).toBe(true);
    });

    it('debería establecer los puntos totales calculados para la misión', () => {
      getStore().setTotalMissionPoints(99);
      expect(getStore().totalMissionPoints).toBe(99);
    });
  });

  describe('Initial Data Loading (fetchInitialData)', () => {
    it('debería obtener datos iniciales y aplicar filtros para sesiones ocultas', async () => {
      globalThis.localStorage.setItem('token', 'test-token');
      
      axios.get.mockImplementation((url) => {
        if (url.includes('/estado')) {
          return Promise.resolve({
            data: {
              battery_percentage: 80,
              battery_status: 'DISCHARGING',
              current_lat: 40.5,
              current_lon: -3.5,
              system_speed: 1.5,
            }
          });
        }
        if (url.includes('/datos')) {
          return Promise.resolve({
            data: [
              { ejecucion_id: 1, lat: 40.5, lon: -3.5 }, 
              { nombre_mision: 'borrada', lat: 0, lon: 0 } 
            ]
          });
        }
      });

      useRobotStore.setState({ deletedSessionKeys: ['miss-borrada'] });

      await getStore().fetchInitialData();

      const state = getStore();
      expect(state.battery.percentage).toBe(80);
      expect(state.position.lat).toBe(40.5);
      expect(state.agronomicData.length).toBe(1);
      expect(state.pathHistory.length).toBe(1);
    });

    it('debería aplicar valores de respaldo cuando faltan propiedades', async () => {
      globalThis.localStorage.removeItem('token');
      axios.get.mockImplementation((url) => {
        if (url.includes('/estado')) {
          return Promise.resolve({ data: { battery_percentage: 10 } }); 
        }
        if (url.includes('/datos')) {
          return Promise.resolve({ data: { fallo: "formato invalido" } }); 
        }
      });

      await getStore().fetchInitialData();
      
      const state = getStore();
      expect(state.battery.voltage).toBe(12.5);
      expect(state.battery.temperature).toBe(30);
      expect(state.agronomicData).toEqual([]); 
    });

    it('debería capturar errores de conexión silenciosamente en carga inicial', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));
      await getStore().fetchInitialData();
      expect(consoleSpy).toHaveBeenCalledWith("Error en carga inicial:", expect.any(Error));
    });
  });

  describe('Conexión WebSocket', () => {
    it('debería conectar socket, registrar listeners y emitir zona segura', () => {
      useRobotStore.setState({ safeZone: [[0,0], [1,1]] });
      getStore().connectSocket();
      
      expect(io).toHaveBeenCalled();
      
      socketCallbacks['connect']();
      expect(getStore().isConnected).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:update_zone", [[0,0], [1,1]]);

      socketCallbacks['disconnect']();
      expect(getStore().isConnected).toBe(false);
    });

    it('debería omitir inicialización si ya existe instancia de socket', () => {
      useRobotStore.setState({ socket: mockSocket });
      getStore().connectSocket();
      expect(io).not.toHaveBeenCalled(); 
    });

    it('debería recalcular Rumbo visual si desplazamiento excede umbral', () => {
      getStore().connectSocket();
      
      useRobotStore.setState({ position: { lat: 40, lon: -3 }, system: { mode: 'AUTO', heading: 0 } });

      const incomingData = {
        battery: { solarInput: 10, consumption: 2 }, 
        position: { lat: 41, lon: -2 }, 
        system: { speedLimit: 60 }
      };

      socketCallbacks['robot:status'](incomingData);

      const state = getStore();
      expect(state.battery.netPower).toBe(8); 
      expect(state.system.speedLimit).toBe(60);
      expect(state.system.heading).not.toBe(0); 
    });

    it('debería omitir cálculo de Rumbo si distancia es ruido GPS', () => {
      getStore().connectSocket();
      useRobotStore.setState({ position: { lat: 40, lon: -3 }, system: { heading: 90 } });
      
      socketCallbacks['robot:status']({ position: { lat: 40.000001, lon: -3.000001 } }); 
      expect(getStore().system.heading).toBe(90);
    });

    it('debería ignorar inserciones de datos si pertenecen a sesiones ocultas', () => {
      useRobotStore.setState({ deletedSessionKeys: ['exec-99'] });
      getStore().connectSocket();

      socketCallbacks['robot:new_data']({ ejecucion_id: 99, lat: 1, lon: 1 });
      expect(getStore().agronomicData.length).toBe(0);

      socketCallbacks['robot:new_data']({ ejecucion_id: 100, lat: 2, lon: 2 });
      expect(getStore().agronomicData.length).toBe(1);
    });
  });

  describe('Emisiones de Control al Servidor', () => {
    beforeEach(() => {
      getStore().connectSocket(); 
    });

    it('debería aplicar límites superior e inferior al ajuste de velocidad', () => {
      getStore().setSpeedLimit(150); 
      expect(getStore().system.speedLimit).toBe(100);
      
      getStore().setSpeedLimit(-10); 
      expect(getStore().system.speedLimit).toBe(0);

      getStore().setSpeedLimit(75);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:set_speed_limit", 75);
    });

    it('debería encolar coordenadas de navegación o enviar destino directo', () => {
      useRobotStore.setState({ navTarget: null, system: { mode: 'AUTO' } });
      
      getStore().queueNavigationPoint(10, 20);
      expect(getStore().system.mode).toBe('NAVIGATING');
      expect(getStore().navTarget).toEqual({ lat: 10, lon: 20 });
      expect(mockSocket.emit).toHaveBeenCalledWith("client:navigate_to", { lat: 10, lon: 20, clearQueue: true });

      mockSocket.emit.mockClear();
      getStore().queueNavigationPoint(30, 40);
      expect(getStore().navQueue).toEqual([{ lat: 30, lon: 40 }]);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:queue_point", { lat: 30, lon: 40 });
    });

    it('debería emitir comandos de movimiento manual solo si modo es MANUAL', () => {
      useRobotStore.setState({ system: { mode: 'AUTO' } });
      getStore().sendManualMove({ x: 1, y: 0 });
      expect(mockSocket.emit).not.toHaveBeenCalledWith("client:manual_control", expect.anything());

      useRobotStore.setState({ system: { mode: 'MANUAL' } });
      getStore().sendManualMove({ x: 1, y: 0 });
      expect(mockSocket.emit).toHaveBeenCalledWith("client:manual_control", { x: 1, y: 0 });
    });

    it('debería restablecer restricciones y modo al cancelar una misión', () => {
      useRobotStore.setState({ safeZone: [[0,0]] });
      getStore().cancelMission();
      expect(getStore().safeZone).toBeNull();
      expect(getStore().system.mode).toBe('MANUAL');
      expect(mockSocket.emit).toHaveBeenCalledWith("client:cancel_mission");
    });
  });

  describe('Prevención de Fallos', () => {
    it('debería prevenir excepciones si se invocan métodos sin conexión', () => {
      useRobotStore.setState({ socket: null, system: { mode: 'MANUAL', status: 'RUNNING' } });
      
      expect(() => {
        getStore().setSpeedLimit(50);
        getStore().queueNavigationPoint(1, 1);
        getStore().navigateToPoint(1, 1);
        getStore().setSafeZone([[0,0]]);
        getStore().clearSafeZone();
        getStore().setControlMode('AUTO');
        getStore().sendManualMove({ x: 1 });
        getStore().togglePauseMission();
        getStore().cancelMission();
      }).not.toThrow();
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});
