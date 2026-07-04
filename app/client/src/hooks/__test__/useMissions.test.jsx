import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMissions } from '../useMissions';
import { missionService } from '../../services/missionService';

vi.mock('../../services/missionService', () => ({
  missionService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    startRun: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useMissions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('fetchMissions debe cargar las misiones correctamente', async () => {
    const mockMissions = [{ id: 1, name: 'Mision 1' }];
    missionService.getAll.mockResolvedValue(mockMissions);

    const { result } = renderHook(() => useMissions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.missions).toEqual(mockMissions);
    expect(missionService.getAll).toHaveBeenCalled();
  });

  it('createMission debe llamar a missionService y retornar true en exito', async () => {
    const newMission = { name: 'Nueva' };
    missionService.create.mockResolvedValue({ id: 2, ...newMission });

    const { result } = renderHook(() => useMissions(), { wrapper });

    const success = await result.current.createMission(newMission);

    expect(missionService.create).toHaveBeenCalledWith(newMission);
    expect(success).toBe(true);
  });

  it('createMission debe retornar false si ocurre un error', async () => {
    const error = new Error('Error al añadir');
    missionService.create.mockRejectedValue(error);

    const { result } = renderHook(() => useMissions(), { wrapper });

    const success = await result.current.createMission({ name: 'Nueva' });

    expect(success).toBe(false);
  });

  it('deleteMission debe llamar a missionService', async () => {
    missionService.delete.mockResolvedValue({});

    const { result } = renderHook(() => useMissions(), { wrapper });

    await result.current.deleteMission(1);

    expect(missionService.delete).toHaveBeenCalledWith(1);
  });
});
