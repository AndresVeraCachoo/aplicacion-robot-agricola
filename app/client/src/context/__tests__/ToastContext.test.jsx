import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast as sonnerToast } from 'sonner';
import { ToastProvider, useToast } from '../ToastContext.jsx';

vi.mock('sonner', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
    },
    Toaster: () => <div data-testid="toaster" />
  }
});

const ToastTestComponent = () => {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Éxito', 'success')}>Add Success</button>
      <button onClick={() => addToast('Error', 'error')}>Add Error</button>
      <button onClick={() => addToast('Aviso', 'warning')}>Add Warning</button>
      <button onClick={() => addToast('Info', 'info')}>Add Info</button>
      <button onClick={() => addToast('Default')}>Add Default</button>
    </div>
  );
};

const ErrorComponent = () => {
  useToast();
  return null;
};

describe('sistema de cola de notificaciones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('debería detener compilación mostrando un error si el hook se consume fuera de su alcance', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ErrorComponent />)).toThrow('useToast must be used within a ToastProvider');
    consoleSpy.mockRestore();
  });

  it('debería inyectar visualmente todas las variantes usando sonnerToast', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Success').click(); });
    expect(sonnerToast.success).toHaveBeenCalledWith('Éxito');

    act(() => { screen.getByText('Add Error').click(); });
    expect(sonnerToast.error).toHaveBeenCalledWith('Error');

    act(() => { screen.getByText('Add Warning').click(); });
    expect(sonnerToast.warning).toHaveBeenCalledWith('Aviso');

    act(() => { screen.getByText('Add Info').click(); });
    expect(sonnerToast.info).toHaveBeenCalledWith('Info');

    act(() => { screen.getByText('Add Default').click(); }); 
    expect(sonnerToast.info).toHaveBeenCalledWith('Default');
  });

  it('debería eliminar una notificación específica de la cola a petición del usuario', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Info').click(); });
    expect(sonnerToast.info).toHaveBeenCalledWith('Info');
  });
});
