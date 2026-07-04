import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChartWidget from '../ChartWidget.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

// Mock extensivo de Recharts con validación de props y elementos SVG nativos
vi.mock('recharts', () => {
  const dummyPropType = () => null;

  const ResponsiveContainer = ({ children }) => <div data-testid="responsive-wrapper">{children}</div>;
  ResponsiveContainer.propTypes = { children: dummyPropType };

  // Usamos SVG para silenciar las advertencias de React sobre los <linearGradient> y <defs>
  const AreaChart = ({ children }) => <svg data-testid="area-chart">{children}</svg>;
  AreaChart.propTypes = { children: dummyPropType };

  const LineChart = ({ children }) => <svg data-testid="line-chart">{children}</svg>;
  LineChart.propTypes = { children: dummyPropType };

  const BarChart = ({ children }) => <svg data-testid="bar-chart">{children}</svg>;
  BarChart.propTypes = { children: dummyPropType };

  const ScatterChart = ({ children }) => <svg data-testid="scatter-chart">{children}</svg>;
  ScatterChart.propTypes = { children: dummyPropType };

  const ComposedChart = ({ children }) => <svg data-testid="composed-chart">{children}</svg>;
  ComposedChart.propTypes = { children: dummyPropType };

  const XAxis = ({ tickFormatter }) => {
    if (tickFormatter) tickFormatter(new Date('2023-01-01T12:00:00Z').getTime());
    return <g />;
  };
  XAxis.propTypes = { tickFormatter: dummyPropType };

  const Tooltip = ({ formatter, labelFormatter }) => {
    if (formatter) {
      formatter(50, 'humidity');
      formatter(null, 'ph');
    }
    if (labelFormatter) {
      labelFormatter(new Date('2023-01-01T12:00:00Z').getTime());
    }
    return <g />;
  };
  Tooltip.propTypes = { formatter: dummyPropType, labelFormatter: dummyPropType };

  return {
    ResponsiveContainer,
    AreaChart,
    LineChart,
    BarChart,
    ScatterChart,
    ComposedChart,
    Area: () => <path />,
    Line: () => <path />,
    Bar: () => <rect />,
    Scatter: () => <circle />,
    CartesianGrid: () => <g />,
    Legend: () => <g />,
    XAxis,
    YAxis: () => <g />,
    Tooltip,
  };
});

describe('Componente ChartWidget', () => {
  const mockData = [
    { timestamp: '2023-01-01T10:00:00Z', humidity: 40, temperature: 22, ph: null, nitrogen: 10, phosphorus: 5, potassium: 20, radiation: 300 },
    { timestamp: '2023-01-01T11:00:00Z', humidity: 45, temperature: 23, ph: 6.5, nitrogen: 12, phosphorus: 6, potassium: 22, radiation: 350 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra mensaje de No recolectado si los datos están vacíos', () => {
    render(<ChartWidget data={[]} />);
    expect(screen.getByText('data.notCollected')).toBeInTheDocument();
  });

  it('renderiza Gráfico de Área por defecto y permite cambiar mediante botones', () => {
    render(<ChartWidget data={mockData} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    const lineBtn = screen.getByTitle('Línea');
    const barBtn = screen.getByTitle('Barras');
    const scatterBtn = screen.getByTitle('Dispersión');
    const areaBtn = screen.getByTitle('Área');

    fireEvent.click(lineBtn);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    fireEvent.click(barBtn);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

    fireEvent.click(scatterBtn);
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();

    fireEvent.click(areaBtn);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('permite cambiar métrica 1 (eje primario)', () => {
    render(<ChartWidget data={mockData} />);
    const selects = screen.getAllByRole('combobox');
    
    fireEvent.change(selects[0], { target: { value: 'radiation' } });
    expect(selects[0].value).toBe('radiation');
  });

  it('fuerza vista de Gráfico Compuesto si comparación es verdadera', () => {
    render(<ChartWidget data={mockData} forcedCompare={true} />);
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    fireEvent.change(selects[1], { target: { value: 'potassium' } });
    expect(selects[1].value).toBe('potassium');
  });

  it('muestra No recolectado si hay datos pero la métrica tiene puros nulos', () => {
    const dataWithNulls = [{ timestamp: '2023-01-01T10:00:00Z', humidity: null, temperature: null }];
    render(<ChartWidget data={dataWithNulls} forcedCompare={true} />);
    
    expect(screen.getByText('data.notCollected')).toBeInTheDocument();
  });
});
