// app/client/src/features/control/__tests__/CameraFeed.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CameraFeed from '../CameraFeed.jsx';
import { useRobotStore } from '../../../store/robotStore';

vi.mock('../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

describe('Componente CameraFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el iframe del feed de la cámara correctamente', () => {
    useRobotStore.mockReturnValue({ system: { speed: 1.5, heading: 90 } });
    render(<CameraFeed />);

    const iframe = screen.getByTitle('Robot Camera Feed');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'));
    expect(document.querySelector('.camera-crosshair')).toBeInTheDocument();
  });

  it('muestra la velocidad formateada y rumbo (HDG) correctamente desde el store', () => {
    useRobotStore.mockReturnValue({ system: { speed: 2.345, heading: 45.6 } });
    render(<CameraFeed />);

    expect(screen.getByText('2.3 m/s')).toBeInTheDocument();
    expect(screen.getByText('46°')).toBeInTheDocument();
  });

  it('aplica respaldos seguros (0) si el store devuelve nulos o indefinidos', () => {
    useRobotStore.mockReturnValue({ system: {} });
    render(<CameraFeed />);

    expect(screen.getByText('0.0 m/s')).toBeInTheDocument();
    expect(screen.getByText('0°')).toBeInTheDocument();
  });
});
