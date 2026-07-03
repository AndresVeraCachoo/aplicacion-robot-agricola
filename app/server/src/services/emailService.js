import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Cliente de correo configurado para utilizar Gmail.
 * (Puede cambiarse a otros proveedores ajustando las opciones de SMTP).
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use TLS
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

/**
 * Envía un correo electrónico de bienvenida al crear un nuevo usuario,
 * incluyendo sus credenciales temporales.
 * 
 * @param {string} email - Correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario.
 * @param {string} tempPassword - Contraseña temporal autogenerada.
 * @returns {Promise<void>}
 */
export const sendWelcomeEmail = async (email, username, tempPassword) => {
  const mailOptions = {
    from: `"AgroSkopos App" <${env.EMAIL_USER}>`,
    to: email,
    subject: 'Bienvenido a AgroSkopos - Tus Credenciales',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4CAF50;">¡Bienvenido a AgroSkopos!</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente. Aquí tienes tus credenciales temporales de acceso:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Usuario:</strong> ${username}</p>
          <p><strong>Contraseña:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #d9534f;"><strong>IMPORTANTE:</strong> Por razones de seguridad, te pedimos que cambies esta contraseña inmediatamente al iniciar sesión por primera vez desde tu Perfil.</p>
        <p>Saludos,<br>El equipo de AgroSkopos</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envía un correo electrónico a los administradores del sistema con
 * los detalles de un ticket de soporte creado por un usuario.
 * 
 * @param {string} userEmail - Correo electrónico del usuario que solicita soporte.
 * @param {string} type - Tipo o categoría de la incidencia.
 * @param {string} description - Detalles de la incidencia aportados por el usuario.
 * @returns {Promise<void>}
 */
export const sendSupportTicket = async (userEmail, type, description) => {
  const adminEmail = env.ADMIN_EMAIL;
  const mailOptions = {
    from: `"AgroSkopos Soporte" <${env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `NUEVO TICKET: [${type.toUpperCase()}] de ${userEmail}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #d9534f;">Nuevo Ticket de Soporte</h2>
        <p><strong>Remitente:</strong> ${userEmail}</p>
        <p><strong>Tipo de Incidencia:</strong> ${type}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
          <p><strong>Descripción:</strong></p>
          <p style="white-space: pre-wrap;">${description}</p>
        </div>
        <p>Por favor, contacta con el usuario para resolver la incidencia.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
