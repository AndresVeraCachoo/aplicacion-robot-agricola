import { jest } from '@jest/globals';

describe('Motor de Simulación Física (Simulator)', () => {
  let mockQuery;
  let mockIo;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers(); 

    mockQuery = jest.fn();
    mockIo = { emit: jest.fn() }; 

    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    jest.unstable_mockModule('../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Modelos Matemáticos de Entorno', () => {
    it('Debería calcular la radiación solar según la hora del día (nula de noche y máxima al mediodía)', async () => {
      const { calculateSolarRadiation } = await import('../simulator.js');
      
      const noche = new Date('2026-05-10T03:00:00Z'); 
      const mediodia = new Date('2026-05-10T13:00:00Z'); 
      const atardecer = new Date('2026-05-10T19:00:00Z'); 
      
      expect(calculateSolarRadiation(noche)).toBe(0);
      expect(calculateSolarRadiation(mediodia)).toBeGreaterThan(900); 
      expect(calculateSolarRadiation(atardecer)).toBeGreaterThan(0);
      expect(calculateSolarRadiation(atardecer)).toBeLessThan(500); 
    });

    it('Debería devolver un array vacío si la zona de trabajo especificada no forma un polígono cerrado', async () => {
      const { generateCoveragePath } = await import('../simulator.js');
      
      const invalidZone = [[42, -3], [42.1, -3.1]];
      const path = generateCoveragePath(invalidZone);
      
      expect(path).toEqual([]);
    });

    it('Debería generar la ruta de cobertura completa para una zona de trabajo válida', async () => {
      const { generateCoveragePath } = await import('../simulator.js');
      
      const squareZone = [
        [42, -3], 
        [42, -3.01], 
        [42.01, -3.01], 
        [42.01, -3]
      ];
      
      const path = generateCoveragePath(squareZone);
      
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(4); 
      expect(path[0]).toHaveProperty('lat');
      expect(path[0]).toHaveProperty('lon');
    });
  });

  describe('Gestión de Estado y Control del Robot', () => {
    it('Debería procesar los cambios de configuración del robot sin provocar interrupciones en el sistema', async () => {
      const simulator = await import('../simulator.js');
      
      expect(() => {
        simulator.setRobotMode('NAVIGATING');
        simulator.setSpeedLimit(80);
        simulator.setManualVelocity(1, 1);
        simulator.queueNavPoint({ lat: 42.1, lon: -3.1 });
        simulator.setNavigationTarget(42.2, -3.2, true); 
        simulator.pauseSimulation();
        simulator.resumeSimulation();
        simulator.cancelSimulation();
      }).not.toThrow();
    });
  });

  describe('Ciclos de Actualización (Ticks)', () => {
    it('Debería actualizar periódicamente el estado del robot, la energía y enviar los datos a través del WebSocket', async () => {
      const { startRobotSimulation, setRobotMode } = await import('../simulator.js');
      
      startRobotSimulation(mockIo);
      setRobotMode('MANUAL');

      jest.advanceTimersByTime(6000);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE robot_estado SET'), 
        expect.any(Array)
      );

      expect(mockIo.emit).toHaveBeenCalledWith('robot:status', expect.any(Object));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO historial_energia'),
        expect.any(Array)
      );
    });
  });
});