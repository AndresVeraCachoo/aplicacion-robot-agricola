/**
 * @namespace Entidades
 * @description Definiciones de tipos y estructuras de datos centrales del cliente.
 */

/**
 * @typedef {Object} UsuarioSesion
 * @property {string} nombre - Nombre sanitizado del usuario.
 * @property {string} rol - Nivel de permisos ("admin", "operador", "usuario").
 * @property {string} avatar - URL o ruta local de la foto de perfil.
 */

/**
 * @typedef {Object} RobotBateria
 * @property {number} percentage - Nivel de carga (0-100).
 * @property {string} status - Estado de recarga ("IDLE", "CHARGING", "DISCHARGING").
 * @property {number} voltage - Tensión de las celdas en voltios.
 * @property {number} temperature - Temperatura del paquete en grados Celsius.
 * @property {number} solarInput - Energía entrante por paneles solares.
 * @property {number} consumption - Gasto energético de motores y cpu.
 * @property {number} netPower - Balance energético (solarInput - consumption).
 */

/**
 * @typedef {Object} RobotSistema
 * @property {string} status - Estado general operativo.
 * @property {number} speed - Velocidad actual en m/s.
 * @property {number} heading - Orientación compensada en grados.
 * @property {string} mode - Modo de conducción ("AUTO", "MANUAL", "NAVIGATING").
 * @property {number} speedLimit - Tope máximo de velocidad impuesto por el usuario.
 */

/**
 * @typedef {Object} Mision
 * @property {number|string} id - Identificador de base de datos.
 * @property {string} nombre - Etiqueta asignada a la misión.
 * @property {string} fecha_creacion - Marca temporal.
 */