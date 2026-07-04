import { describe, it, expect } from '@jest/globals';
import { generateSensorReadings, shouldSkipAgronomy } from '../systems/agronomy.js';

describe('Simulator - Agronomy System', () => {
  describe('shouldSkipAgronomy', () => {
    it('debería saltar la recolección si el robot está cargando o pausado', () => {
      expect(shouldSkipAgronomy({ isCharging: true })).toBe(true);
      expect(shouldSkipAgronomy({ isPaused: true })).toBe(true);
      expect(shouldSkipAgronomy({ speed: "0" })).toBe(true);
      expect(shouldSkipAgronomy({ controlMode: "RETURNING_TO_BASE" })).toBe(true);
    });

    it('no debería saltar si está en movimiento y no pausado', () => {
      expect(shouldSkipAgronomy({ isCharging: false, isPaused: false, speed: "5", controlMode: "AUTO" })).toBe(false);
    });
  });

  describe('generateSensorReadings', () => {
    it('debería generar todas las lecturas si no hay misión activa', () => {
      const readings = generateSensorReadings("", 40.0, -3.0, false);
      expect(readings.cHum).not.toBeNull();
      expect(readings.cTemp).not.toBeNull();
      expect(readings.cPh).not.toBeNull();
      expect(readings.cN).not.toBeNull();
      expect(readings.cRad).not.toBeNull();
    });

    it('debería filtrar sensores según el tipo de tarea', () => {
      // Solo humedad y temp
      const readings = generateSensorReadings("humedad, temp", 40.0, -3.0, true);
      expect(readings.cHum).not.toBeNull();
      expect(readings.cTemp).not.toBeNull();
      expect(readings.cPh).toBeNull();
      expect(readings.cN).toBeNull();
    });

    it('los valores generados deben estar dentro de límites razonables', () => {
      const readings = generateSensorReadings("", 40.0, -3.0, false);
      
      const hum = parseFloat(readings.cHum);
      expect(hum).toBeGreaterThanOrEqual(0);
      expect(hum).toBeLessThanOrEqual(100);

      const ph = parseFloat(readings.cPh);
      expect(ph).toBeGreaterThanOrEqual(4);
      expect(ph).toBeLessThanOrEqual(10);
    });
  });
});
