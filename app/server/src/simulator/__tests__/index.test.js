import { jest } from '@jest/globals';

describe('Motor de Simulación Física', () => {
  let mockUpdate, mockCreate, mockExecuteRawUnsafe;
  let mockIo;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers(); 

    mockUpdate = jest.fn();
    mockCreate = jest.fn();
    mockExecuteRawUnsafe = jest.fn();

    mockIo = { emit: jest.fn() }; 

    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.log = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      prisma: {
        robotState: { update: mockUpdate },
        energyHistory: { create: mockCreate },
        $executeRawUnsafe: mockExecuteRawUnsafe
      }
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Modelos Matemáticos Ambientales', () => {
    it('Debería calcular radiación solar basada en hora del día', async () => {
      const { calculateSolarRadiation } = await import('../systems/energy.js');
      
      const night = new Date(); night.setHours(3, 0, 0, 0);
      const noon = new Date(); noon.setHours(13, 0, 0, 0);
      const sunset = new Date(); sunset.setHours(19, 0, 0, 0);
      
      expect(calculateSolarRadiation(night)).toBe(0);
      expect(calculateSolarRadiation(noon)).toBeGreaterThan(900); 
      expect(calculateSolarRadiation(sunset)).toBeGreaterThan(0);
      expect(calculateSolarRadiation(sunset)).toBeLessThan(500); 
    });

    it('Debería retornar un array vacío si la zona no forma polígono cerrado', async () => {
      const { generateCoveragePath } = await import('../utils.js');
      
      const invalidZone = [[42, -3], [42.1, -3.1]];
      const path = generateCoveragePath(invalidZone);
      
      expect(path).toEqual([]);
    });

    it('Debería generar la ruta de cobertura completa para una zona válida', async () => {
      const { generateCoveragePath } = await import('../utils.js');
      
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

  describe('Gestión de Estado y Control de Robot', () => {
    it('Debería procesar cambios de configuración sin causar interrupciones', async () => {
      const simulator = await import('../index.js');
      
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

  describe('Ciclos de Actualización', () => {
    it('Debería actualizar periódicamente estado, energía y emitir datos por WebSocket', async () => {
      const { startRobotSimulation, setRobotMode } = await import('../index.js');
      
      startRobotSimulation(mockIo);
      setRobotMode('MANUAL');

      jest.advanceTimersByTime(6000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );

      expect(mockIo.emit).toHaveBeenCalledWith('robot:status', expect.any(Object));

      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
