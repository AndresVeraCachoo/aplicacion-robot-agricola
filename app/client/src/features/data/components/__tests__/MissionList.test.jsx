import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MissionList from '../MissionList';

describe('MissionList Component', () => {
  const mockSessions = [
    {
      id: 1,
      name: 'Mision A',
      endTime: '2026-01-01T10:00:00Z',
      dataPoints: [{ id: 10 }]
    },
    {
      id: 2,
      name: null,
      endTime: '2026-01-02T12:00:00Z',
      dataPoints: []
    }
  ];

  const defaultProps = {
    executedSessions: mockSessions,
    selectedSessionId: null,
    setSelectedSessionId: vi.fn(),
    deleteSessionData: vi.fn(),
    selectedSession: null,
    t: vi.fn(key => key),
    i18n: { language: 'es-ES' }
  };

  it('debe renderizar el título correctamente', () => {
    render(<MissionList {...defaultProps} />);
    expect(screen.getByText('data.executionHistory')).toBeInTheDocument();
  });

  it('debe mostrar mensaje vacío cuando no hay sesiones', () => {
    render(<MissionList {...defaultProps} executedSessions={[]} />);
    expect(screen.getByText('data.noMissionsFilter')).toBeInTheDocument();
  });

  it('debe renderizar la lista de sesiones', () => {
    render(<MissionList {...defaultProps} />);
    expect(screen.getByText('Mision A')).toBeInTheDocument();
    // No validamos la hora exacta porque puede cambiar por la zona horaria del test runner
    expect(screen.getByText('1 data.pts')).toBeInTheDocument();
  });

  it('debe llamar a setSelectedSessionId al hacer clic en una misión', () => {
    render(<MissionList {...defaultProps} />);
    
    const missionButton = screen.getByText('Mision A');
    fireEvent.click(missionButton);
    
    expect(defaultProps.setSelectedSessionId).toHaveBeenCalledWith(1);
  });

  it('debe mostrar confirmación y llamar a deleteSessionData al borrar', () => {
    render(<MissionList {...defaultProps} />);
    
    // El botón de papelera es el que contiene el emoji de papelera
    const deleteBtn = screen.getAllByText('🗑️')[0];
    
    fireEvent.click(deleteBtn);
    
    expect(defaultProps.deleteSessionData).toHaveBeenCalledWith(1);
  });
});
