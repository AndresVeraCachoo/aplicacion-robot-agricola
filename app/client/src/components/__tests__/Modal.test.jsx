import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Modal from '../Modal.jsx';

// 1. Mock de las traducciones (i18next)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key, // Devuelve la misma key para facilitar las aserciones
  }),
}));

describe('Componente Modal', () => {
  beforeEach(() => {
    // Controlamos el tiempo para testear los setTimeout de las animaciones
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('no se renderiza en el DOM si isOpen es falso', () => {
    const { container } = render(<Modal isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza y aplica clase visible tras el retraso inicial', () => {
    render(
      <Modal isOpen={true} title="Test Modal">
        <p>Contenido del modal</p>
      </Modal>
    );
    
    const overlay = document.querySelector('.modal-overlay');
    // Inicialmente no debe tener la clase visible
    expect(overlay.className).not.toContain('visible');

    // Avanzamos el reloj 10ms para activar el primer setTimeout
    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Verificamos que se haya aplicado la clase de animación
    expect(overlay.className).toContain('visible');
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument();
  });

  it('llama a onClose al hacer clic en el botón de cerrar y en el fondo', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} />);
    
    // Activar visibilidad
    act(() => { vi.advanceTimersByTime(10); });

    // El primer botón es el backdrop invisible, el segundo es la "X"
    const closeButtons = screen.getAllByRole('button', { name: 'modal.close' });
    
    // Clic en la "X"
    fireEvent.click(closeButtons[1]);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clic en el backdrop
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('llama a onClose cuando se presiona la tecla Escape', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('elimina eventListener y no falla si se presiona otra tecla o onClose no existe', () => {
    const handleClose = vi.fn();
    const { unmount } = render(<Modal isOpen={true} onClose={handleClose} />);
    
    // Presionar otra tecla
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
    expect(handleClose).not.toHaveBeenCalled();

    // Desmontar para verificar limpieza del listener
    unmount();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('maneja correctamente la animación de cierre y desmontaje después de 300ms', () => {
    const { rerender, container } = render(<Modal isOpen={true} />);
    
    act(() => { vi.advanceTimersByTime(10); });
    expect(document.querySelector('.modal-overlay').className).toContain('visible');

    // Actualizamos las props para cerrar el modal
    rerender(<Modal isOpen={false} />);
    
    // La clase visible debe desaparecer instantáneamente
    expect(document.querySelector('.modal-overlay').className).not.toContain('visible');
    
    // Avanzamos 300ms para disparar el segundo setTimeout
    act(() => { vi.advanceTimersByTime(300); });
    
    // El modal debe haber sido desmontado del DOM
    expect(container.firstChild).toBeNull();
  });
});
