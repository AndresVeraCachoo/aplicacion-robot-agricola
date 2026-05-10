// server/src/config/__tests__/db.test.js
import { jest } from '@jest/globals';

describe('Configuración de Base de Datos (config/db.js)', () => {
  // Guardamos una copia limpia de las variables de entorno originales
  const originalEnv = process.env;

  beforeEach(() => {
    // Restauramos las variables de entorno antes de cada test para aislarlos
    process.env = { ...originalEnv };
    // Limpiamos la caché de módulos de Jest
    jest.resetModules();
  });

  afterAll(() => {
    // Devolvemos a la normalidad al terminar el archivo
    process.env = originalEnv;
  });

  it('Debe inicializar el Pool con los valores por defecto si no hay variables de entorno', async () => {
    // 1. ARRANGE (Preparar)
    // Borramos explícitamente las variables de entorno para simular que no existen
    delete process.env.DB_USER;
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_PORT;

    // Creamos el mock falso de PostgreSQL
    const mockPoolInstance = { connect: jest.fn() };
    const mockPg = { Pool: jest.fn(() => mockPoolInstance) };
    
    // Levantamos el escudo protector bloqueando la librería 'pg' REAL
    jest.unstable_mockModule('pg', () => ({
      default: mockPg,
    }));

    // 2. ACT (Actuar)
    // Importamos dinámicamente tu archivo. 
    // TRUCO ENTERPRISE: Añadimos '?default' al final para obligar a Node.js (ESM) 
    // a re-evaluar el archivo y no usar la versión en caché de otros tests.
    const { pool } = await import(`../db.js?default`);

    // 3. ASSERT (Comprobar)
    expect(mockPg.Pool).toHaveBeenCalledTimes(1);
    expect(mockPg.Pool).toHaveBeenCalledWith({
      user: 'postgres',
      host: 'localhost',
      database: 'robot_dashboard_db',
      password: undefined,
      port: 5432,
    });
    // Comprobamos que lo que exporta tu archivo es exactamente nuestra instancia falsa
    expect(pool).toBe(mockPoolInstance);
  });

  it('Debe inicializar el Pool con las variables de entorno personalizadas si existen', async () => {
    // 1. ARRANGE (Preparar)
    // Simulamos que el archivo .env ha inyectado estas variables
    process.env.DB_USER = 'admin_robot';
    process.env.DB_HOST = '192.168.1.100';
    process.env.DB_NAME = 'production_db';
    process.env.DB_PASSWORD = 'super_secret_password';
    process.env.DB_PORT = '5433';

    const mockPoolInstance = { connect: jest.fn() };
    const mockPg = { Pool: jest.fn(() => mockPoolInstance) };
    
    jest.unstable_mockModule('pg', () => ({
      default: mockPg,
    }));

    // 2. ACT (Actuar)
    // Volvemos a importar el archivo, pero forzamos una nueva evaluación ('?custom')
    const { pool } = await import(`../db.js?custom`);

    // 3. ASSERT (Comprobar)
    expect(mockPg.Pool).toHaveBeenCalledTimes(1);
    expect(mockPg.Pool).toHaveBeenCalledWith({
      user: 'admin_robot',
      host: '192.168.1.100',
      database: 'production_db',
      password: 'super_secret_password',
      port: '5433', // Tu código lo pasará como string porque viene de process.env, es correcto.
    });
    expect(pool).toBe(mockPoolInstance);
  });
});