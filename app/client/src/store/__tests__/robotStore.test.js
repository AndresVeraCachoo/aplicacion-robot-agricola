import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRobotStore } from '../robotStore';
import axios from 'axios';
import { io } from 'socket.io-client';

vi.mock('axios');
vi.mock('socket.io-client', () => ({ io: vi.fn() }));

describe('robotStore', () => {
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
      isSidebarOpen: true, // Para poder testear el toggle
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

  // =========================================================
  // BLOQUE 1: GESTIÓN DE INTERFAZ
  // =========================================================
  describe('Gestión de Interfaz', () => {
    it('alterna (toggle) y establece el estado del Sidebar', () => {
      getStore().setSidebarOpen(false);
      expect(getStore().isSidebarOpen).toBe(false);

      getStore().toggleSidebar();
      expect(getStore().isSidebarOpen).toBe(true);
    });

    it('establece los puntos totales de la misión', () => {
      getStore().setTotalMissionPoints(99);
      expect(getStore().totalMissionPoints).toBe(99);
    });
  });

  // =========================================================
  // BLOQUE 2: AXIOS Y Carga Inicial (fetchInitialData)
  // =========================================================
  describe('fetchInitialData (Axios)', () => {
    it('obtiene los datos iniciales con token y aplica filtros de sesiones borradas', async () => {
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

    it('Ramas null/falsy: fetchInitialData sin token, sin arrays y fallbacks de bateria', async () => {
      globalThis.localStorage.removeItem('token');
      axios.get.mockImplementation((url) => {
        if (url.includes('/estado')) {
          return Promise.resolve({ data: { battery_percentage: 10 } }); // Faltan propiedades para forzar los fallback (||)
        }
        if (url.includes('/datos')) {
          return Promise.resolve({ data: { unObjeto: "no es array" } }); 
        }
      });

      await getStore().fetchInitialData();
      
      const state = getStore();
      expect(state.battery.voltage).toBe(12.5);
      expect(state.battery.temperature).toBe(30);
      expect(state.battery.timeRemaining).toBe("Calculando...");
      expect(state.agronomicData).toEqual([]); 
    });

    it('captura errores de red (catch) en fetchInitialData', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));
      await getStore().fetchInitialData();
      expect(consoleSpy).toHaveBeenCalledWith("Error carga inicial:", expect.any(Error));
    });
  });

  // =========================================================
  // BLOQUE 3: CONEXIÓN SOCKET Y EVENTOS SERVIDOR
  // =========================================================
  describe('Conexión Socket y Eventos', () => {
    it('conecta el socket, registra listeners y emite zona segura al conectar', () => {
      useRobotStore.setState({ safeZone: [[0,0], [1,1]] });
      getStore().connectSocket();
      
      expect(io).toHaveBeenCalled();
      
      // Simula conexión
      socketCallbacks['connect']();
      expect(getStore().isConnected).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:update_zone", [[0,0], [1,1]]);

      // Simula desconexión
      socketCallbacks['disconnect']();
      expect(getStore().isConnected).toBe(false);
    });

    it('ignora la conexión si ya existe un socket', () => {
      useRobotStore.setState({ socket: mockSocket });
      getStore().connectSocket();
      expect(io).not.toHaveBeenCalled(); 
    });

    it('robot:status -> procesa batería y ejecuta calculateBearing por distancia > 0.000005', () => {
      getStore().connectSocket();
      
      useRobotStore.setState({ position: { lat: 40, lon: -3 }, system: { mode: 'AUTO', heading: 0 } });

      const incomingData = {
        battery: { solarInput: 10, consumption: 2 }, 
        position: { lat: 41, lon: -2 }, // Distancia grande para forzar calculateBearing
        system: { speedLimit: 60 }
      };

      socketCallbacks['robot:status'](incomingData);

      const state = getStore();
      expect(state.battery.netPower).toBe(8); 
      expect(state.system.speedLimit).toBe(60);
      expect(state.system.heading).not.toBe(0); // Bearing fue calculado
    });

    it('robot:status -> NO calcula bearing si la distancia es mínima', () => {
      getStore().connectSocket();
      useRobotStore.setState({ position: { lat: 40, lon: -3 }, system: { heading: 90 } });
      
      socketCallbacks['robot:status']({ position: { lat: 40.000001, lon: -3.000001 } }); 
      expect(getStore().system.heading).toBe(90);
    });

    it('robot:status -> asigna heading en MANUAL si viene definido en payload', () => {
      getStore().connectSocket();
      useRobotStore.setState({ system: { mode: 'MANUAL', heading: 0 } });
      
      socketCallbacks['robot:status']({ system: { heading: 100 } }); 
      // (100 - 80 + 360) % 360 = 380 % 360 = 20
      expect(getStore().system.heading).toBe(20);
    });

    it('robot:new_data -> añade dato, e ignora sesiones borradas', () => {
      useRobotStore.setState({ deletedSessionKeys: ['exec-99'] });
      getStore().connectSocket();

      // Dato ignorado
      socketCallbacks['robot:new_data']({ ejecucion_id: 99, lat: 1, lon: 1 });
      expect(getStore().agronomicData.length).toBe(0);

      // Dato válido
      socketCallbacks['robot:new_data']({ ejecucion_id: 100, lat: 2, lon: 2 });
      expect(getStore().agronomicData.length).toBe(1);
    });

    it('robot:new_data -> usa nombre_mision si ejecucion_id no existe', () => {
      getStore().connectSocket();
      useRobotStore.setState({ deletedSessionKeys: ['miss-miss1'] });
      
      // Debe ser ignorado
      socketCallbacks['robot:new_data']({ nombre_mision: 'miss1', lat: 10, lon: 10 });
      expect(getStore().agronomicData.length).toBe(0);
    });
  });

  // =========================================================
  // BLOQUE 4: ACCIONES MANUALES Y EMISIONES SOCKET
  // =========================================================
  describe('Acciones manuales y emisiones (Emits)', () => {
    beforeEach(() => {
      getStore().connectSocket(); // Inyecta el mockSocket en el state
    });

    it('desconecta el socket', () => {
      getStore().disconnectSocket();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(getStore().socket).toBeNull();
      expect(getStore().isConnected).toBe(false);
    });

    it('desconecta el socket silenciosamente si ya es null', () => {
      useRobotStore.setState({ socket: null });
      getStore().disconnectSocket();
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('setSpeedLimit: limita entre 0 y 100 y emite', () => {
      getStore().setSpeedLimit(150); // > 100
      expect(getStore().system.speedLimit).toBe(100);
      
      getStore().setSpeedLimit(-10); // < 0
      expect(getStore().system.speedLimit).toBe(0);

      getStore().setSpeedLimit(75);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:set_speed_limit", 75);
    });

    it('setControlMode: actualiza y emite', () => {
      getStore().setControlMode('MANUAL');
      expect(mockSocket.emit).toHaveBeenCalledWith("client:change_mode", 'MANUAL');
    });

    it('sendManualMove: emite solo si el modo es MANUAL', () => {
      useRobotStore.setState({ system: { mode: 'AUTO' } });
      getStore().sendManualMove({ x: 1, y: 0 });
      expect(mockSocket.emit).not.toHaveBeenCalledWith("client:manual_control", expect.anything());

      useRobotStore.setState({ system: { mode: 'MANUAL' } });
      getStore().sendManualMove({ x: 1, y: 0 });
      expect(mockSocket.emit).toHaveBeenCalledWith("client:manual_control", { x: 1, y: 0 });
    });

    it('togglePauseMission: alterna pausa y reanudar', () => {
      useRobotStore.setState({ system: { status: 'RUNNING' } });
      getStore().togglePauseMission();
      expect(mockSocket.emit).toHaveBeenCalledWith("client:pause_mission");

      useRobotStore.setState({ system: { status: 'PAUSED' } });
      getStore().togglePauseMission();
      expect(mockSocket.emit).toHaveBeenCalledWith("client:resume_mission");
    });

    it('navigateToPoint y queueNavigationPoint', () => {
      useRobotStore.setState({ navTarget: null, system: { mode: 'AUTO' } });
      
      // Si no hay objetivo, va directo a navigateToPoint
      getStore().queueNavigationPoint(10, 20);
      expect(getStore().system.mode).toBe('NAVIGATING');
      expect(getStore().navTarget).toEqual({ lat: 10, lon: 20 });
      expect(mockSocket.emit).toHaveBeenCalledWith("client:navigate_to", { lat: 10, lon: 20, clearQueue: true });

      // Si ya hay objetivo, lo añade a la cola (else branch)
      mockSocket.emit.mockClear();
      getStore().queueNavigationPoint(30, 40);
      expect(getStore().navQueue).toEqual([{ lat: 30, lon: 40 }]);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:queue_point", { lat: 30, lon: 40 });
    });

    it('setSafeZone y clearSafeZone', () => {
      getStore().setSafeZone([[0,0], [1,1]]);
      expect(mockSocket.emit).toHaveBeenCalledWith("client:update_zone", [[0,0], [1,1]]);

      getStore().clearSafeZone();
      expect(mockSocket.emit).toHaveBeenCalledWith("client:clear_zone");
    });

    it('cancelMission: limpia zona, pasa a MANUAL y emite', () => {
      useRobotStore.setState({ safeZone: [[0,0]] });
      getStore().cancelMission();
      expect(getStore().safeZone).toBeNull();
      expect(getStore().system.mode).toBe('MANUAL');
      expect(mockSocket.emit).toHaveBeenCalledWith("client:cancel_mission");
    });

    it('deleteSessionData: añade key a eliminados y filtra agronomicData', () => {
      useRobotStore.setState({ 
        agronomicData: [{ ejecucion_id: 1 }, { nombre_mision: 'miss2' }]
      });

      getStore().deleteSessionData('exec-1');
      expect(getStore().deletedSessionKeys).toContain('exec-1');
      expect(getStore().agronomicData.length).toBe(1);
    });
  });

  describe('Branch Coverage (Lógica Defensiva Socket === Null)', () => {
    it('los metodos de control no crashean si socket es null', () => {
      useRobotStore.setState({ socket: null, system: { mode: 'MANUAL', status: 'RUNNING' } });
      
      getStore().setSpeedLimit(50);
      getStore().queueNavigationPoint(1, 1);
      getStore().navigateToPoint(1, 1);
      getStore().setSafeZone([[0,0]]);
      getStore().clearSafeZone();
      getStore().setControlMode('AUTO');
      getStore().sendManualMove({ x: 1 });
      getStore().togglePauseMission();
      getStore().cancelMission();
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});