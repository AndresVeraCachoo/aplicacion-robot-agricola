// server/src/scripts/__tests__/seed.test.js
import { jest } from '@jest/globals';

describe('Seed Script', () => {
  let mockQuery;
  let originalConsoleLog, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();

    // 1. ARRANGE genérico
    mockQuery = jest.fn();

    // Ocultamos los console.log y console.error para que la terminal de tests quede limpia
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    // Mockeamos la Base de Datos
    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));

    // Mockeamos las librerías externas para que sean ultra rápidas
    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: jest.fn().mockResolvedValue('hashed-password') },
    }));

    // Mockeamos el simulador (para no calcular matemáticas complejas en este test)
    jest.unstable_mockModule('../../simulator.js', () => ({
      generateCoveragePath: jest.fn().mockReturnValue([{ lat: 42, lon: -3 }]),
      calculateSolarRadiation: jest.fn().mockReturnValue(800),
    }));
  });

  afterEach(() => {
    // Restauramos la consola
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('Debe abortar y no hacer nada si la base de datos ya tiene usuarios', async () => {
    // 1. ARRANGE
    // Simulamos que el COUNT(*) devuelve 5 usuarios
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    
    const { runSeed } = await import('../seed.js');

    // 2. ACT
    await runSeed();

    // 3. ASSERT
    expect(mockQuery).toHaveBeenCalledTimes(1); // Solo hizo la consulta de COUNT
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Datos detectados en BD. Ignorando semilla"));
  });

  it('Debe ejecutar toda la siembra (seed) si la base de datos está vacía', async () => {
    // 1. ARRANGE
    // Simulamos que el COUNT(*) devuelve 0, y el resto de queries devuelven IDs simulados
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // COUNT usuarios
      .mockResolvedValue({ rows: [{ id: 1 }] }); // Para los RETURNING id de misiones y ejecuciones

    const { runSeed } = await import('../seed.js');

    // 2. ACT
    await runSeed();

    // 3. ASSERT
    expect(mockQuery.mock.calls.length).toBeGreaterThan(5); // Aseguramos que hizo un montón de queries (Usuarios, Misiones, Historial...)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("BD sembrada con éxito"));
  });

  it('Debe lanzar un error inmediato si ocurre un error no recuperable', async () => {
    // 1. ARRANGE
    // Simulamos un error fatal de sintaxis (no de conexión)
    const fatalError = new Error("Syntax error in SQL");
    mockQuery.mockRejectedValueOnce(fatalError);

    const { runSeed } = await import('../seed.js');

    // 2. ACT & ASSERT
    await expect(runSeed()).rejects.toThrow("Syntax error in SQL");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error interno al inyectar datos"), "Syntax error in SQL");
  });

  it('Debe reintentar si hay un error de conexión (ECONNREFUSED) y fallar tras maxRetries', async () => {
    // 1. ARRANGE
    // Creamos un error de conexión
    const connectionError = new Error("Connection refused");
    connectionError.code = 'ECONNREFUSED';
    
    // Hacemos que la BD falle TODAS las veces
    mockQuery.mockRejectedValue(connectionError);

    const { runSeed } = await import('../seed.js');

    // 2. ACT & ASSERT
    // Llamamos a runSeed con 3 reintentos y 0 milisegundos de espera (para que el test sea instantáneo)
    await expect(runSeed(3, 0)).rejects.toThrow("Connection refused");
    
    // Verificamos que lo intentó exactamente 3 veces antes de rendirse
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error crítico de conexión"), "Connection refused");
  });
});