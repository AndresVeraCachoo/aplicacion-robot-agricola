import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import httpClient from '../httpClient';
import { toast } from 'sonner';

// Mock de módulos externos
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  }
}));

vi.mock('../../i18n/index.js', () => ({
  default: {
    t: vi.fn((key) => `translated_${key}`),
    exists: vi.fn((key) => key.includes('KNOWN')),
  }
}));

describe('httpClient interceptors', () => {
  let errorInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    errorInterceptor = httpClient.interceptors.response.handlers[0].rejected;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe tener withCredentials en true', () => {
    expect(httpClient.defaults.withCredentials).toBe(true);
  });

  it('debe propagar un error 401 de /auth/login sin intentar refrescar', async () => {
    const testError = {
      config: { url: '/api/auth/login' },
      response: { status: 401 }
    };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
  });

  it('debe mostrar toast de error genérico si no hay response.data', async () => {
    const testError = { config: { url: '/api/robot/estado' } };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    expect(toast.error).toHaveBeenCalledWith('translated_errors.SERVICE_UNAVAILABLE');
  });

  it('debe manejar error 400 con un errorCode conocido', async () => {
    const testError = {
      config: { url: '/api/robot/estado' },
      response: { status: 400, data: { errorCode: 'KNOWN_ERROR' } }
    };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    expect(toast.error).toHaveBeenCalledWith('translated_errors.KNOWN_ERROR');
  });

  it('debe manejar error con un mensaje directamente', async () => {
    const testError = {
      config: { url: '/api/robot/estado' },
      response: { status: 400, data: { error: 'Mensaje directo' } }
    };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    expect(toast.error).toHaveBeenCalledWith('Mensaje directo');
  });

  it('debe manejar error con errorCode desconocido', async () => {
    const testError = {
      config: { url: '/api/robot/estado' },
      response: { status: 400, data: { errorCode: 'UNKNOWN_CODE' } }
    };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    expect(toast.error).toHaveBeenCalledWith('translated_errors.UNKNOWN_CODE');
  });

  it('debe manejar errores de validación (VALIDATION_ERROR)', async () => {
    const testError = {
      config: { url: '/api/robot/estado' },
      response: { 
        status: 400,
        data: {
          errorCode: 'VALIDATION_ERROR',
          details: [{ message: 'El campo nombre es requerido' }]
        }
      }
    };
    await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    expect(toast.warning).toHaveBeenCalledWith('translated_El campo nombre es requerido');
  });

  describe('Refresh token logic', () => {
    let originalPost;
    
    beforeEach(() => {
      originalPost = httpClient.post;

    });

    afterEach(() => {
      httpClient.post = originalPost;
    });

    it('debe lanzar el error si originalRequest._retry es true', async () => {
      const testError = {
        config: { url: '/api/data', _retry: true },
        response: { status: 401 }
      };
      await expect(errorInterceptor(testError)).rejects.toMatchObject(testError);
    });
  });
});
