import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../authService';
import httpClient from '../../config/httpClient';

vi.mock('../../config/httpClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería hacer POST a /auth/login con credenciales', async () => {
    httpClient.post.mockResolvedValue({ data: { token: 'mockToken' } });
    const result = await authService.login('user', 'pass');
    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', { name: 'user', password: 'pass' });
    expect(result).toEqual({ token: 'mockToken' });
  });

  it('debería hacer POST a /auth/logout', async () => {
    httpClient.post.mockResolvedValue({ data: { message: 'Logged out' } });
    const result = await authService.logout();
    expect(httpClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('debería hacer GET a /auth/verify', async () => {
    httpClient.get.mockResolvedValue({ data: { user: { role: 'admin' } } });
    const result = await authService.verifySession();
    expect(httpClient.get).toHaveBeenCalledWith('/auth/verify');
    expect(result).toEqual({ user: { role: 'admin' } });
  });
});
