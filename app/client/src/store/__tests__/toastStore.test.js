import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToastStore } from '../toastStore';
import { toast as sonnerToast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn()
  }
}));

describe('useToastStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería añadir un toast de tipo info por defecto', () => {
    useToastStore.getState().addToast('Mensaje info');
    expect(sonnerToast.info).toHaveBeenCalledWith('Mensaje info');
  });

  it('debería añadir un toast de tipo success', () => {
    useToastStore.getState().addToast('Mensaje success', 'success');
    expect(sonnerToast.success).toHaveBeenCalledWith('Mensaje success');
  });

  it('debería añadir un toast de tipo error', () => {
    useToastStore.getState().addToast('Mensaje error', 'error');
    expect(sonnerToast.error).toHaveBeenCalledWith('Mensaje error');
  });

  it('debería añadir un toast de tipo warning', () => {
    useToastStore.getState().addToast('Mensaje warning', 'warning');
    expect(sonnerToast.warning).toHaveBeenCalledWith('Mensaje warning');
  });

  it('debería remover un toast', () => {
    useToastStore.getState().removeToast(123);
    expect(sonnerToast.dismiss).toHaveBeenCalledWith(123);
  });
});
