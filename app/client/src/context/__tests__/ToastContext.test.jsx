import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../ToastContext.jsx';

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

  it('debería inyectar visualmente todas las variantes resolviendo su iconografía', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Success').click(); });
    act(() => { screen.getByText('Add Error').click(); });
    act(() => { screen.getByText('Add Warning').click(); });
    act(() => { screen.getByText('Add Info').click(); });
    act(() => { screen.getByText('Add Default').click(); }); 

    expect(screen.getByText('Éxito')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('🚨')).toBeInTheDocument();
    
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    
    expect(screen.getAllByText('ℹ️')).toHaveLength(2);
  });

  it('debería eliminar una notificación específica de la cola a petición del usuario', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Info').click(); });
    expect(screen.getByText('Info')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /×/i });
    act(() => { closeButton.click(); });

    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('debería auto-limpiar la cola respetando el ciclo de visualización de 3.5s', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Success').click(); });
    expect(screen.getByText('Éxito')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Éxito')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByText('Éxito')).not.toBeInTheDocument();
  });
});
