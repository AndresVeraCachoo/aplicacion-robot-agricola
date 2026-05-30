import { jest } from '@jest/globals';

describe('Configuración de Base de Datos (config/db.js)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('Debería inicializar el Pool con los valores por defecto si no hay variables de entorno', async () => {
    delete process.env.DB_USER;
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_PORT;

    const mockPoolInstance = { connect: jest.fn() };
    const mockPg = { Pool: jest.fn(() => mockPoolInstance) };
    
    jest.unstable_mockModule('pg', () => ({ default: mockPg }));

    const { pool } = await import(`../db.js?default`);

    expect(mockPg.Pool).toHaveBeenCalledTimes(1);
    expect(mockPg.Pool).toHaveBeenCalledWith({
      user: 'postgres',
      host: 'localhost',
      database: 'robot_dashboard_db',
      password: undefined,
      port: 5432,
    });
    
    expect(pool).toBe(mockPoolInstance);
  });

  it('Debería inicializar el Pool aplicando las variables de entorno personalizadas si existen', async () => {
    process.env.DB_USER = 'admin_robot';
    process.env.DB_HOST = 'db-custom.local';
    process.env.DB_NAME = 'production_db';
    process.env.DB_PASSWORD = 'super_secret_password';
    process.env.DB_PORT = '5433';

    const mockPoolInstance = { connect: jest.fn() };
    const mockPg = { Pool: jest.fn(() => mockPoolInstance) };
    
    jest.unstable_mockModule('pg', () => ({ default: mockPg }));

    const { pool } = await import(`../db.js?custom`);

    expect(mockPg.Pool).toHaveBeenCalledTimes(1);
    expect(mockPg.Pool).toHaveBeenCalledWith({
      user: 'admin_robot',
      host: 'db-custom.local',
      database: 'production_db',
      password: 'super_secret_password',
      port: '5433', 
    });
    
    expect(pool).toBe(mockPoolInstance);
  });
});