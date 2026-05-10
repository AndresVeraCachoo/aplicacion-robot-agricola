// server/src/__tests__/simulator.test.js
import { jest } from '@jest/globals';

describe('Robot Simulator', () => {
  let mockQuery;
  let mockIo;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    // 1. ARRANGE
    jest.resetModules();
    
    // Congelamos el tiempo y lo controlamos nosotros
    jest.useFakeTimers(); 

    mockQuery = jest.fn();
    mockIo = { emit: jest.fn() }; // Simulamos los WebSockets (socket.io)

    // Ocultamos los logs para no manchar la terminal
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    // Mockeamos la BD
    jest.unstable_mockModule('../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
  });

  afterEach(() => {
    // Restauramos el tiempo real y la consola
    jest.useRealTimers();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Matemáticas y Físicas Puras', () => {
    it('calculateSolarRadiation debe devolver 0 de noche y el pico máximo al mediodía', async () => {
      const { calculateSolarRadiation } = await import('../simulator.js');
      
      const noche = new Date('2026-05-10T03:00:00Z'); // 3 AM
      const mediodia = new Date('2026-05-10T13:00:00Z'); // 1 PM (Pico solar)
      const atardecer = new Date('2026-05-10T19:00:00Z'); // 7 PM
      
      expect(calculateSolarRadiation(noche)).toBe(0);
      expect(calculateSolarRadiation(mediodia)).toBeGreaterThan(900); // Casi 1000 de radiación
      expect(calculateSolarRadiation(atardecer)).toBeGreaterThan(0);
      expect(calculateSolarRadiation(atardecer)).toBeLessThan(500); // Va bajando
    });

    it('generateCoveragePath debe devolver un array vacío si la zona es inválida', async () => {
      const { generateCoveragePath } = await import('../simulator.js');
      
      // Le pasamos solo 2 puntos (no forman un polígono)
      const invalidZone = [[42, -3], [42.1, -3.1]];
      const path = generateCoveragePath(invalidZone);
      
      expect(path).toEqual([]);
    });

    it('generateCoveragePath debe generar un camino en zig-zag (Grid) válido', async () => {
      const { generateCoveragePath } = await import('../simulator.js');
      
      // Un cuadrado perfecto
      const squareZone = [
        [42, -3], 
        [42, -3.01], 
        [42.01, -3.01], 
        [42.01, -3]
      ];
      
      const path = generateCoveragePath(squareZone);
      
      // Debe haber generado el perímetro y los puntos internos
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(4); 
      // Comprobamos la estructura del primer punto generado
      expect(path[0]).toHaveProperty('lat');
      expect(path[0]).toHaveProperty('lon');
    });
  });

  describe('Gestión de Estado y Control del Robot', () => {
    it('Debe cambiar los estados, límites y colas de navegación correctamente', async () => {
      const simulator = await import('../simulator.js');
      
      // Comprobamos que las funciones de seteo no rompen nada
      expect(() => {
        simulator.setRobotMode('NAVIGATING');
        simulator.setSpeedLimit(80);
        simulator.setManualVelocity(1, 1);
        simulator.queueNavPoint({ lat: 42.1, lon: -3.1 });
        simulator.setNavigationTarget(42.2, -3.2, true); // Limpiar cola
        simulator.pauseSimulation();
        simulator.resumeSimulation();
        simulator.cancelSimulation();
      }).not.toThrow();
    });
  });

  describe('El Bucle de Simulación (Ticks)', () => {
    it('Debe ejecutar los Ticks de movimiento y energía emitiendo por WebSocket y guardando en BD', async () => {
      const { startRobotSimulation, setRobotMode } = await import('../simulator.js');
      
      // 1. Iniciamos el simulador (se programan los setInterval)
      startRobotSimulation(mockIo);
      
      // Ponemos al robot en manual para que intente moverse o consumir energía
      setRobotMode('MANUAL');

      // 2. ACT: Avanzamos el tiempo de Jest artificialmente 6 segundos 
      // (Supera el MOVEMENT_INTERVAL de 1s y el ENERGY_LOG_INTERVAL de 5s)
      jest.advanceTimersByTime(6000);

      // 3. ASSERT: Comprobamos qué pasó en esos 6 segundos virtuales
      
      // El de movimiento (cada 1s) debería haberse ejecutado 6 veces
      // Cada tick hace un UPDATE a robot_estado en la BD
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE robot_estado SET'), 
        expect.any(Array)
      );

      // El WebSocket debería haber emitido la información al Frontend
      expect(mockIo.emit).toHaveBeenCalledWith('robot:status', expect.any(Object));

      // El de energía (cada 5s) debería haberse ejecutado al menos 1 vez
      // Debería insertar en historial_energia
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO historial_energia'),
        expect.any(Array)
      );
    });
  });
});