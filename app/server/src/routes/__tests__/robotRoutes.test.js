// server/src/routes/__tests__/robotRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Robot Routes', () => {
  let app;
  let mockAuthenticateToken, mockGetEstadoRobot;
  let originalConsoleError;

  beforeEach(async () => {
    jest.resetModules();
    
    originalConsoleError = console.error;
    console.error = jest.fn(); // Ocultamos el log rojo esperado en el test del error 500

    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockGetEstadoRobot = jest.fn(); // Lo configuraremos en cada test

    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken,
    }));

    jest.unstable_mockModule('../../controllers/robotController.js', () => ({
      getEstadoRobot: mockGetEstadoRobot,
      getDatosAgronomicos: jest.fn(),
      getHistorialEnergia: jest.fn(),
    }));

    const { default: robotRoutes } = await import('../robotRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/robot', robotRoutes);
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('Debe llamar al controlador y devolver 200 si todo va bien', async () => {
    mockGetEstadoRobot.mockImplementation((req, res) => res.status(200).json({ status: 'ok' }));

    const res = await request(app).get('/robot/estado');

    expect(mockAuthenticateToken).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Debe devolver 500 si el controlador lanza un error (Testeando handleAsync local)', async () => {
    // Simulamos que el controlador explota (ej: la BD se cayó)
    mockGetEstadoRobot.mockImplementation(() => {
      throw new Error('Explosión en la base de datos');
    });

    const res = await request(app).get('/robot/estado');

    // Comprobamos que el "handleAsync" atrapó la explosión y devolvió 500
    expect(console.error).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });
});