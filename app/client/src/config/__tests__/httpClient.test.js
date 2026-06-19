import { describe, it, expect, beforeEach, vi } from 'vitest';
import httpClient from '../httpClient';

describe('configuración de httpClient', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset interceptors if needed, but here we can just test the existing one
  });

  it('agrega encabezado Authorization cuando el token está en localStorage', async () => {
    localStorage.setItem('token', 'test-token');
    
    // We can simulate an intercepted request by calling the fulfill handler directly.
    // The request interceptors are stored in httpClient.interceptors.request.handlers
    const requestInterceptor = httpClient.interceptors.request.handlers[0].fulfilled;
    
    const config = { headers: {} };
    const newConfig = await requestInterceptor(config);
    
    expect(newConfig.headers['Authorization']).toBe('Bearer test-token');
  });

  it('no agrega encabezado Authorization cuando falta el token', async () => {
    const requestInterceptor = httpClient.interceptors.request.handlers[0].fulfilled;
    
    const config = { headers: {} };
    const newConfig = await requestInterceptor(config);
    
    expect(newConfig.headers['Authorization']).toBeUndefined();
  });

  it('rechaza la promesa cuando ocurre un error en la petición', async () => {
    const errorInterceptor = httpClient.interceptors.request.handlers[0].rejected;
    
    const testError = new Error('Request failed');
    await expect(errorInterceptor(testError)).rejects.toThrow('Request failed');
  });
});
