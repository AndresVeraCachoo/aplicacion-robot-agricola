import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Cliente de correo configurado para utilizar Gmail.
 * (Puede cambiarse a otros proveedores ajustando las opciones de SMTP).
 */
export const transporter = process.env.NODE_ENV === 'test'
  ? nodemailer.createTransport({ jsonTransport: true }) // NOSONAR
  : nodemailer.createTransport({ // NOSONAR
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

/**
 * Envía un correo electrónico de bienvenida al crear un nuevo usuario,
 * incluyendo sus credenciales temporales.
 * * @param {string} email - Correo electrónico del destinatario.
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
 * * @param {string} userEmail - Correo electrónico del usuario que solicita soporte.
 * @param {string} type - Tipo o categoría de la incidencia.
 * @param {string} description - Detalles de la incidencia aportados por el usuario.
 * @returns {Promise<void>}
 */
export const sendSupportTicket = async (userEmail, type, description, adminEmails = []) => {
  const toEmails = adminEmails.length > 0 ? adminEmails.join(', ') : env.ADMIN_EMAIL;

  const isRealEmail = userEmail && !userEmail.endsWith('@sistema.local');

  const mailOptions = {
    from: isRealEmail ? `"${userEmail}" <${env.EMAIL_USER}>` : `"AgroSkopos Soporte" <${env.EMAIL_USER}>`,
    to: toEmails,
    ...(isRealEmail && { replyTo: userEmail }),
    subject: `NUEVO TICKET: [${type.toUpperCase()}] de ${userEmail}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #d9534f;">Nuevo Ticket de Soporte</h2>
        <p><strong>Remitente:</strong> ${userEmail}${isRealEmail ? ` (<a href="mailto:${userEmail}">responder directamente</a>)` : ' (sin correo asociado)'}</p>
        <p><strong>Tipo de Incidencia:</strong> ${type}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
          <p><strong>Descripción:</strong></p>
          <p style="white-space: pre-wrap;">${description}</p>
        </div>
        ${isRealEmail ? `<p style="color: #555;">💡 Puedes responder directamente a este correo para contactar con el usuario.</p>` : ''}
        <p>Por favor, contacta con el usuario para resolver la incidencia.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envía un correo con un archivo adjunto (PDF o CSV) al usuario que lo generó.
 * * @param {string} userEmail - Correo electrónico del usuario autenticado.
 * @param {string} fileBase64 - Contenido del archivo en formato base64.
 * @param {string} filename - Nombre del archivo a enviar.
 * @param {string} fileType - Tipo MIME (application/pdf o text/csv).
 * @returns {Promise<void>}
 */
export const sendReportEmail = async (userEmail, fileBase64, filename, fileType) => {
  const base64Data = fileBase64.includes('base64,') ? fileBase64.split('base64,')[1] : fileBase64;

  const mailOptions = {
    from: `"AgroSkopos Reportes" <${env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Reporte de Misión Exportado: ${filename}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4CAF50;">Aquí tienes tu reporte</h2>
        <p>Has solicitado la exportación de los datos de la misión desde el panel de AgroSkopos.</p>
        <p>Encuentras el archivo generado (<strong>${filename}</strong>) adjunto a este correo.</p>
        <br>
        <p>Saludos,<br>El equipo de AgroSkopos</p>
      </div>
    `,
    attachments: [
      {
        filename: filename,
        content: base64Data,
        encoding: 'base64',
        contentType: fileType
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};