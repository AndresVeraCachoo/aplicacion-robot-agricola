/**

 * @description Configuración de la especificación OpenAPI/Swagger para generar la documentación de la API REST.
 */

import swaggerJSDoc from "swagger-jsdoc";

/**
 * Metadatos de la API y esquemas de seguridad requeridos por Swagger.
 * @type {Object}
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
  apis: ["./src/routes/*.js"], 
};

/**
 * Especificación compilada de Swagger lista para ser servida por la interfaz de usuario.
 * @type {Object}
 */
export const swaggerSpec = swaggerJSDoc(options);