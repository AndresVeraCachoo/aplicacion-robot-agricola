import { createMissionSchema, updateExecutionSchema } from '../missionSchema.js';

describe("Esquema de Misión", () => {
  it("Debería validar una configuración de misión con datos completos", () => {
    const data = { 
      body: { 
        name: "Mission Alpha", taskType: "Harvest", workWidth: 10, 
        passAngle: 90, minBattery: 20, workArea: { type: "Polygon" } 
      } 
    };
    expect(() => createMissionSchema.parse(data)).not.toThrow();
  });

  it("Debería aceptar fechas programadas que cumplen el estándar", () => {
    const data = { 
      body: { 
        name: "A", taskType: "B", workWidth: 10, passAngle: 90, 
        minBattery: 20, workArea: {}, scheduledTime: "2026-05-28T14:02:00Z" 
      } 
    };
    const result = createMissionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("Debería rechazar formatos de fecha inválidos a través de validador", () => {
    const data = { body: { endTime: "fake-date" } };
    const result = updateExecutionSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/valid ISO 8601 date format/i);
  });
});
