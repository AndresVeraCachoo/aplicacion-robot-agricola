import { describe, it, expect, beforeEach } from 'vitest';
import httpClient from '../httpClient';

describe('configuración de httpClient', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset interceptors if needed, but here we can just test the existing one
  });

  it('configura axios con credentials true en lugar de localStorage tokens', () => {
    expect(httpClient.defaults.withCredentials).toBe(true);
  });

  it('rechaza la promesa cuando ocurre un error en la petición', async () => {
    const errorInterceptor = httpClient.interceptors.request.handlers[0].rejected;
    
    const testError = new Error('Request failed');
    await expect(errorInterceptor(testError)).rejects.toThrow('Request failed');
  });
});
