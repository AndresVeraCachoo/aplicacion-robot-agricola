// server/src/middlewares/__tests__/errorHandler.test.js
import { jest } from '@jest/globals';

describe('Error Handler Middleware', () => {
  let err, req, res, next, originalConsoleError;

  beforeEach(() => {
    jest.resetModules();
    
    // ARRANGE
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Truco Enterprise: El errorHandler hace un console.error real en tu código. 
    // Para que nuestra terminal no se llene de letras rojas al pasar los tests, lo mockeamos temporalmente.
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restauramos el console.error original para no afectar a otros archivos
    console.error = originalConsoleError;
  });

  it('Debe formatear y devolver un error personalizado con su código de estado', async () => {
    // 1. ARRANGE
    err = new Error('No tienes permisos');
    err.statusCode = 403; // Error personalizado (ej. creado por tu auth.js)

    const { errorHandler } = await import('../errorHandler.js');

    // 2. ACT
    errorHandler(err, req, res, next);

    // 3. ASSERT
    expect(console.error).toHaveBeenCalled(); // Verificamos que se logueó el error
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes permisos' });
  });

  it('Debe hacer fallback a 500 y un mensaje genérico si el error es desconocido', async () => {
    // 1. ARRANGE
    err = new Error('Fallo genérico del sistema de prueba'); // Un error del sistema sin statusCode ni mensaje definido
    
    const { errorHandler } = await import('../errorHandler.js');

    // 2. ACT
    errorHandler(err, req, res, next);

    // 3. ASSERT
    expect(console.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500); // Comprobamos el fallback a 500
    expect(res.json).toHaveBeenCalledWith({ error: 'Fallo genérico del sistema de prueba' }); // Comprobamos el fallback del mensaje
  });

  it('Debe usar los fallbacks si el error está mal formado (sin stack ni mensaje)', async () => {
    // 1. ARRANGE
    const errVacio = { }; // No es de clase Error, no tiene .message, ni .statusCode, ni .stack
    const { errorHandler } = await import('../errorHandler.js');

    // 2. ACT
    errorHandler(errVacio, req, res, next);

    // 3. ASSERT
    expect(console.error).toHaveBeenCalledWith("🔥 [ERROR GLOBAL]:", errVacio); // Fallback: al no haber err.stack, imprime el objeto entero
    expect(res.status).toHaveBeenCalledWith(500); // Fallback: al no haber err.statusCode, usa 500
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' }); // Fallback del mensaje
  });
});