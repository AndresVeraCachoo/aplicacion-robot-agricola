import { describe, it, expect, vi, beforeEach } from 'vitest';
import { missionService } from '../missionService';
import httpClient from '../../config/httpClient';

vi.mock('../../config/httpClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('missionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería hacer GET a /missions', async () => {
    httpClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Misión 1' }] });
    const result = await missionService.getAll();
    expect(httpClient.get).toHaveBeenCalledWith('/missions');
    expect(result).toEqual([{ id: 1, name: 'Misión 1' }]);
  });

  it('debería hacer POST a /missions con datos', async () => {
    const newMission = { name: 'Nueva' };
    httpClient.post.mockResolvedValue({ data: { id: 2, ...newMission } });
    const result = await missionService.create(newMission);
    expect(httpClient.post).toHaveBeenCalledWith('/missions', newMission);
    expect(result).toEqual({ id: 2, name: 'Nueva' });
  });

  it('debería hacer PUT a /missions/:id con datos actualizados', async () => {
    const updatedMission = { name: 'Actualizada' };
    httpClient.put.mockResolvedValue({ data: { id: 3, ...updatedMission } });
    const result = await missionService.update(3, updatedMission);
    expect(httpClient.put).toHaveBeenCalledWith('/missions/3', updatedMission);
    expect(result).toEqual({ id: 3, name: 'Actualizada' });
  });

  it('debería hacer DELETE a /missions/:id', async () => {
    httpClient.delete.mockResolvedValue({ data: {} });
    await missionService.delete(4);
    expect(httpClient.delete).toHaveBeenCalledWith('/missions/4');
  });

  it('debería hacer POST a /missions/:id/runs para iniciar misión', async () => {
    httpClient.post.mockResolvedValue({ data: { id: 10, status: 'in_progress' } });
    const result = await missionService.startRun(5);
    expect(httpClient.post).toHaveBeenCalledWith('/missions/5/runs');
    expect(result).toEqual({ id: 10, status: 'in_progress' });
  });
});
