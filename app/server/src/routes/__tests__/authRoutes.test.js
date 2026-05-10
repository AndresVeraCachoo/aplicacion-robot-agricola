// server/src/routes/__tests__/authRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Auth Routes', () => {
  let app;
  let mockLogin, mockVerify, mockAuthenticateToken;

  beforeEach(async () => {
    jest.resetModules();

    // 1. ARRANGE: Preparamos los mocks de controladores y middlewares
    mockLogin = jest.fn((req, res) => res.status(200).json({ msg: 'login_ok' }));
    mockVerify = jest.fn((req, res) => res.status(200).json({ msg: 'verify_ok' }));
    
    // El middleware falso dejará pasar la petición
    mockAuthenticateToken = jest.fn((req, res, next) => next()); 

    jest.unstable_mockModule('../../controllers/authController.js', () => ({
      login: mockLogin,
      verify: mockVerify,
    }));

    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken,
    }));

    // Importamos las rutas de forma dinámica
    const { default: authRoutes } = await import('../authRoutes.js');

    // Creamos un servidor Express en miniatura solo para este test
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  it('Debe dirigir POST /auth/login al controlador de login', async () => {
    // 2. ACT
    const res = await request(app).post('/auth/login').send({ name: 'admin', password: '123' });

    // 3. ASSERT
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('login_ok');
  });

  it('Debe bloquear con 429 si se hacen más de 10 peticiones a /login (Rate Limit)', async () => {
    // 2. ACT: Bombardeamos el servidor con 11 peticiones
    for (let i = 0; i < 10; i++) {
      await request(app).post('/auth/login').send({});
    }
    const resBloqueada = await request(app).post('/auth/login').send({}); // La petición nº 11

    // 3. ASSERT
    expect(resBloqueada.status).toBe(429); // Too Many Requests
    expect(resBloqueada.text).toContain("Demasiados intentos fallidos");
  });

  it('Debe aplicar el middleware authenticateToken y luego llamar a verify en GET /auth/verify', async () => {
    // 2. ACT
    const res = await request(app).get('/auth/verify');

    // 3. ASSERT
    expect(mockAuthenticateToken).toHaveBeenCalledTimes(1); // Pasó por el guardia
    expect(mockVerify).toHaveBeenCalledTimes(1); // Llegó al controlador
    expect(res.status).toBe(200);
  });
});