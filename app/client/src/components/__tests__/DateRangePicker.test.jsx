import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateRangePicker } from '../DateRangePicker.jsx';

// 1. Mock de i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback, // Devolvemos el texto por defecto
    i18n: { language: 'es' }
  }),
}));

// 2. Mock simplificado de react-datepicker para aislar la lógica del test
vi.mock('react-datepicker', () => ({
  default: ({ id, selected, onChange, placeholderText }) => (
    <input
      data-testid={id}
      placeholder={placeholderText}
      value={selected ? selected.toISOString() : ''}
      onChange={(e) => {
        const val = e.target.value;
        // Simulamos el comportamiento del picker devolviendo un objeto Date o null
        onChange(val ? new Date(val) : null);
      }}
    />
  ),
}));

describe('DateRangePicker Component', () => {
  const mockOnFilter = vi.fn();
  const mockMisiones = [
    { id: '1', nombre: 'Misión Alfa' },
    { id: '2', nombre: 'Misión Beta' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Interceptamos la alerta nativa del navegador
    vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
  });

  it('renderiza todos los elementos y opciones de misiones', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    expect(screen.getByText('DATOS:')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Todos los datos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Misión Alfa' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Misión Beta' })).toBeInTheDocument();
  });

  it('lanza un alert y detiene la ejecución si se selecciona sólo la fecha de inicio', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    const startDateInput = screen.getByTestId('filter-start-date');
    fireEvent.change(startDateInput, { target: { value: '2023-10-01T10:00:00.000Z' } });

    const applyButton = screen.getByText('Aplicar');
    fireEvent.click(applyButton);

    expect(globalThis.alert).toHaveBeenCalledWith('Por favor, selecciona tanto la fecha de inicio como la de fin.');
    expect(mockOnFilter).not.toHaveBeenCalled();
  });

  it('lanza un alert y detiene la ejecución si se selecciona sólo la fecha de fin', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    const endDateInput = screen.getByTestId('filter-end-date');
    fireEvent.change(endDateInput, { target: { value: '2023-10-05T10:00:00.000Z' } });

    const applyButton = screen.getByText('Aplicar');
    fireEvent.click(applyButton);

    expect(globalThis.alert).toHaveBeenCalledWith('Por favor, selecciona tanto la fecha de inicio como la de fin.');
    expect(mockOnFilter).not.toHaveBeenCalled();
  });

  it('llama a onFilter con las fechas en ISO y el ID de misión al aplicar', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    const startDateInput = screen.getByTestId('filter-start-date');
    const endDateInput = screen.getByTestId('filter-end-date');
    const select = screen.getByRole('combobox');

    // Cambiar estado interno a través de eventos
    fireEvent.change(startDateInput, { target: { value: '2023-10-01T00:00:00.000Z' } });
    fireEvent.change(endDateInput, { target: { value: '2023-10-31T23:59:00.000Z' } });
    fireEvent.change(select, { target: { value: '2' } });

    const applyButton = screen.getByText('Aplicar');
    fireEvent.click(applyButton);

    // Debe recibir las fechas parseadas y el ID de misión seleccionado
    expect(mockOnFilter).toHaveBeenCalledWith(
      '2023-10-01T00:00:00.000Z',
      '2023-10-31T23:59:00.000Z',
      '2'
    );
  });

  it('llama a onFilter con nulls cuando se presiona Limpiar', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    // Seteamos un valor inicial primero para asegurar que el clear hace su trabajo
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    
    const clearButton = screen.getByText('Limpiar');
    fireEvent.click(clearButton);

    // El state debe resetearse a default
    expect(select.value).toBe('');
    expect(mockOnFilter).toHaveBeenCalledWith(null, null, null);
  });

  it('devuelve id nulo si no se ha seleccionado una misión específica', () => {
    render(<DateRangePicker onFilter={mockOnFilter} misiones={mockMisiones} />);
    
    const applyButton = screen.getByText('Aplicar');
    fireEvent.click(applyButton); // Se aplican fechas vacías y misión en opción 'Todos' ("")

    expect(mockOnFilter).toHaveBeenCalledWith(null, null, null);
  });
});