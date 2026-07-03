import { jest } from '@jest/globals';

describe('Script de Población (Seed)', () => {
  let mockQuery;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();

    mockQuery = jest.fn();

    // Silencia la consola para no saturar la salida del ejecutor de pruebas (Jest)
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    // Simula pg directamente en lugar de db.js ya que seed.js instancia su propio pool
    jest.unstable_mockModule('pg', () => ({
      default: { Pool: jest.fn(() => ({ query: mockQuery })) },
    }));

    jest.unstable_mockModule('../../config/env.js', () => ({
      env: { DATABASE_URL: 'postgres://test:test@localhost:5432/test' }
    }));

    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: jest.fn().mockResolvedValue('hashed-password') },
    }));

    // Simula las físicas del simulador para aislar las pruebas a la lógica del script SQL
    jest.unstable_mockModule('../../simulator/utils.js', () => ({
      generateCoveragePath: jest.fn().mockReturnValue([{ lat: 42, lon: -3 }]),
    }));

    jest.unstable_mockModule('../../simulator/systems/energy.js', () => ({
      calculateSolarRadiation: jest.fn(() => 500),
    }));
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('Debería abortar de forma idempotente si la base de datos ya contiene usuarios', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    
    const { runSeed } = await import('../seed.js');
    await runSeed();

    expect(mockQuery).toHaveBeenCalledTimes(1); 
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Datos detectados en BD"));
  });

  it('Debería ejecutar consultas secuenciales si la BD está vacía', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) 
      .mockResolvedValue({ rows: [{ id: 1 }] }); 

    const { runSeed } = await import('../seed.js');
    await runSeed();

    expect(mockQuery.mock.calls.length).toBeGreaterThan(5); 
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("BD poblada exitosamente"));
  });

  it('Debería propagar excepciones si ocurre un error sintáctico irrecoverable', async () => {
    const fatalError = new Error("Error de sintaxis en SQL");
    mockQuery.mockRejectedValueOnce(fatalError);

    const { runSeed } = await import('../seed.js');

    await expect(runSeed()).rejects.toThrow("Error de sintaxis en SQL");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error interno inyectando datos"), "Error de sintaxis en SQL");
  });

  it('Debería aplicar reintentos si detecta fallo de conexión ECONNREFUSED', async () => {
    const connectionError = new Error("Conexión rechazada");
    connectionError.code = 'ECONNREFUSED';
    mockQuery.mockRejectedValue(connectionError);

    const { runSeed } = await import('../seed.js');

    // delayMs se establece en 0 para que la ejecución de la prueba sea instantánea independientemente de los reintentos
    await expect(runSeed(3, 0)).rejects.toThrow("Conexión rechazada");
    
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error crítico de conexión"), "Conexión rechazada");
  });
});
