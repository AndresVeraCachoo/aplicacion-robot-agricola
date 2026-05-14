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

// Componente para probar el error de contexto fuera del Provider
const ErrorComponent = () => {
  useToast();
  return null;
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('lanza un error si useToast se usa fuera del ToastProvider', () => {
    // Evitamos que la consola se llene de errores de React durante el test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ErrorComponent />)).toThrow('useToast debe ser usado dentro de un ToastProvider');
    consoleSpy.mockRestore();
  });

  it('renderiza todos los tipos de toasts con sus iconos correspondientes', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Success').click(); });
    act(() => { screen.getByText('Add Error').click(); });
    act(() => { screen.getByText('Add Warning').click(); });
    act(() => { screen.getByText('Add Info').click(); });
    act(() => { screen.getByText('Add Default').click(); }); // Para probar el default param 'info'

    expect(screen.getByText('Éxito')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('🚨')).toBeInTheDocument();
    
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    
    // Habrá dos informativos (el explícito y el por defecto)
    expect(screen.getAllByText('ℹ️')).toHaveLength(2);
  });

  it('permite cerrar un toast manualmente haciendo clic en la X', () => {
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

  it('elimina los toasts automáticamente después de 3500ms', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByText('Add Success').click(); });
    expect(screen.getByText('Éxito')).toBeInTheDocument();

    // Avanzamos 3000ms, aún debe estar
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Éxito')).toBeInTheDocument();

    // Avanzamos 500ms más (total 3500), debe desaparecer
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByText('Éxito')).not.toBeInTheDocument();
  });
});