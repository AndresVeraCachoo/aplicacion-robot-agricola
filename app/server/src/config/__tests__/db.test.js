import { jest } from '@jest/globals';

describe('Configuración de Base de Datos', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('Debería inicializar Pool con DATABASE_URL y crear PrismaClient', async () => {
    const mockPoolInstance = {};
    const mockPg = { Pool: jest.fn(() => mockPoolInstance) };
    
    const mockAdapterInstance = {};
    const mockPrismaPg = jest.fn(() => mockAdapterInstance);
    
    const mockPrismaClientInstance = {};
    const mockPrismaClient = jest.fn(() => mockPrismaClientInstance);

    jest.unstable_mockModule('pg', () => ({ default: mockPg }));
    jest.unstable_mockModule('@prisma/adapter-pg', () => ({ PrismaPg: mockPrismaPg }));
    jest.unstable_mockModule('../../generated/prisma/index.js', () => ({ PrismaClient: mockPrismaClient }));
    jest.unstable_mockModule('../env.js', () => ({
      env: { DATABASE_URL: 'postgres://user:pass@host:5432/db' }
    }));

    const { prisma } = await import(`../db.js?test=${Date.now()}`);

    expect(mockPg.Pool).toHaveBeenCalledTimes(1);
    expect(mockPg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@host:5432/db',
    });
    
    expect(mockPrismaPg).toHaveBeenCalledWith(mockPoolInstance);
    
    expect(mockPrismaClient).toHaveBeenCalledWith({
      adapter: mockAdapterInstance,
      log: ["error"]
    });
    
    expect(prisma).toBe(mockPrismaClientInstance);
  });
});
