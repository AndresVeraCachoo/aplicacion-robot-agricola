import swaggerJSDoc from "swagger-jsdoc";

/**
 * Configuración central del generador de documentación Swagger.
 * Define los metadatos de la API, los esquemas de seguridad globales y las rutas donde debe escanear el JSDoc.
 */
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API del Sistema de Control AgroSkopos",
      version: "1.0.0",
      description: "Documentación interactiva de la API REST para la gestión, monitorización y control de AgroSkopos.",
    },
    servers: [
      {
        url: "http://localhost:3001/api",
        description: "Servidor local de desarrollo"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Introduce el token JWT obtenido al hacer login"
        }
      }
    }
  },
  // Patrón de búsqueda para parsear todos los comentarios de las rutas
  apis: ["./src/routes/*.js"], 
};

export const swaggerSpec = swaggerJSDoc(options);