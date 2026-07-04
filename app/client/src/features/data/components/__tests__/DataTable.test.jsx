import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataTable from '../DataTable';

describe('DataTable Component', () => {
  const mockData = [
    {
      id: 1,
      timestamp: '2026-07-03T10:00:00Z',
      missionName: 'Auto Mision',
      lat: 40,
      lon: -3,
      humidity: 50,
      soilTemperature: 22.5,
      ph: 6.5,
      nitrogen: 100,
      phosphorus: 50,
      potassium: 150,
      solarRadiation: 800
    },
    {
      id: 2,
      timestamp: '2026-07-03T11:00:00Z',
      missionName: null,
      lat: 40.1,
      lon: -3.1,
      humidity: null,
      soilTemperature: null,
      ph: null,
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      solarRadiation: null
    }
  ];

  const defaultProps = {
    displayData: mockData,
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    setCurrentPage: vi.fn(),
    jumpPage: '',
    setJumpPage: vi.fn(),
    handleJumpToPage: vi.fn(e => e.preventDefault()),
    filteredData: null,
    t: vi.fn(key => key),
    i18n: { language: 'es-ES' }
  };

  it('debe renderizar la tabla correctamente con datos', () => {
    render(<DataTable {...defaultProps} />);
    
    // Header
    expect(screen.getByText('data.recordsTable')).toBeInTheDocument();
    
    // Column headers
    expect(screen.getByText('data.time')).toBeInTheDocument();
    expect(screen.getByText('data.missions')).toBeInTheDocument();
    
    // Rows
    expect(screen.getByText('Auto Mision')).toBeInTheDocument();
    expect(screen.getByText('data.manual')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('22.5°C')).toBeInTheDocument();
  });

  it('debe manejar datos nulos mostrando NotCollected', () => {
    render(<DataTable {...defaultProps} />);
    
    const notCollectedElements = screen.getAllByText('data.notCollected');
    expect(notCollectedElements.length).toBeGreaterThan(0);
  });

  it('debe mostrar mensaje vacío cuando no hay datos', () => {
    render(<DataTable {...defaultProps} displayData={[]} />);
    expect(screen.getByText('data.waitingData')).toBeInTheDocument();
  });

  it('debe manejar la paginación correctamente', () => {
    const props = { ...defaultProps, totalPages: 3, currentPage: 2 };
    render(<DataTable {...props} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3); // Prev, Jump, Next
    
    fireEvent.click(buttons[0]); // Prev
    expect(props.setCurrentPage).toHaveBeenCalled();
  });
});
