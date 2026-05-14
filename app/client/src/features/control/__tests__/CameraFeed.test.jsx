// app/client/src/features/control/__tests__/CameraFeed.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CameraFeed from '../CameraFeed.jsx';
import { useRobotStore } from '../../../store/robotStore';

vi.mock('../../../store/robotStore', () => ({
  useRobotStore: vi.fn(),
}));

describe('CameraFeed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente el iframe del feed de la cámara', () => {
    useRobotStore.mockReturnValue({ system: { speed: 1.5, heading: 90 } });
    render(<CameraFeed />);

    const iframe = screen.getByTitle('Robot Camera Feed');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'));
    expect(document.querySelector('.camera-crosshair')).toBeInTheDocument();
  });

  it('muestra la velocidad y el heading (HDG) correctamente formateados desde el store', () => {
    useRobotStore.mockReturnValue({ system: { speed: 2.345, heading: 45.6 } });
    render(<CameraFeed />);

    expect(screen.getByText('2.3 m/s')).toBeInTheDocument();
    expect(screen.getByText('46°')).toBeInTheDocument();
  });

  it('aplica fallbacks seguros (0) si el store devuelve valores nulos o indefinidos', () => {
    useRobotStore.mockReturnValue({ system: {} });
    render(<CameraFeed />);

    expect(screen.getByText('0.0 m/s')).toBeInTheDocument();
    expect(screen.getByText('0°')).toBeInTheDocument();
  });
});