import { createMisionSchema, updateEjecucionSchema } from '../missionSchema.js';

describe("🚜 Esquema de Misiones (missionSchema)", () => {
  it("✅ Debería validar una misión con datos correctos", () => {
    const data = { 
      body: { 
        nombre: "Misión Alfa", tipo_tarea: "Cosecha", ancho_trabajo: 10, 
        angulo_pasada: 90, bateria_minima: 20, area_trabajo: { type: "Polygon" } 
      } 
    };
    expect(() => createMisionSchema.parse(data)).not.toThrow();
  });

  it("✅ Debería validar una fecha ISO 8601 correcta en fecha_programada", () => {
    const data = { 
      body: { 
        nombre: "A", tipo_tarea: "B", ancho_trabajo: 10, angulo_pasada: 90, 
        bateria_minima: 20, area_trabajo: {}, fecha_programada: "2026-05-28T14:02:00Z" 
      } 
    };
    const result = createMisionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("❌ Debería rechazar una fecha inválida (Validador ISO 8601 personalizado)", () => {
    const data = { body: { fecha_fin: "fecha-inventada" } };
    const result = updateEjecucionSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/ISO 8601 válido/i);
  });
});