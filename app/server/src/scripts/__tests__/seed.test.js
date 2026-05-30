import { jest } from '@jest/globals';

describe('Seed Script', () => {
  let mockQuery;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();

    mockQuery = jest.fn();

    // Silenciamos la consola para no ensuciar la salida del test runner (Jest)
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    // Interceptamos la importación ESM nativa inyectando un pool mockeado
    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));

    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: jest.fn().mockResolvedValue('hashed-password') },
    }));

    // Mockeamos la física del simulador para aislar la prueba a la propia lógica del script SQL
    jest.unstable_mockModule('../../simulator.js', () => ({
      generateCoveragePath: jest.fn().mockReturnValue([{ lat: 42, lon: -3 }]),
      calculateSolarRadiation: jest.fn().mockReturnValue(800),
    }));
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('Debe abortar de forma idempotente si la base de datos ya contiene usuarios', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    
    const { runSeed } = await import('../seed.js');
    await runSeed();

    expect(mockQuery).toHaveBeenCalledTimes(1); 
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Datos detectados en BD. Ignorando semilla"));
  });

  it('Debe ejecutar las consultas secuenciales de siembra si la base de datos está vacía', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) 
      .mockResolvedValue({ rows: [{ id: 1 }] }); 

    const { runSeed } = await import('../seed.js');
    await runSeed();

    expect(mockQuery.mock.calls.length).toBeGreaterThan(5); 
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("BD sembrada con éxito"));
  });

  it('Debe propagar excepciones inmediatamente si ocurre un error sintáctico no recuperable', async () => {
    const fatalError = new Error("Syntax error in SQL");
    mockQuery.mockRejectedValueOnce(fatalError);

    const { runSeed } = await import('../seed.js');

    await expect(runSeed()).rejects.toThrow("Syntax error in SQL");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error interno al inyectar datos"), "Syntax error in SQL");
  });

  it('Debe aplicar reintentos (backoff) si se detecta un fallo de conexión ECONNREFUSED', async () => {
    const connectionError = new Error("Connection refused");
    connectionError.code = 'ECONNREFUSED';
    mockQuery.mockRejectedValue(connectionError);

    const { runSeed } = await import('../seed.js');

    // Se configura el delayMs a 0 para que la ejecución del test sea instantánea independientemente de los reintentos
    await expect(runSeed(3, 0)).rejects.toThrow("Connection refused");
    
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error crítico de conexión"), "Connection refused");
  });
});