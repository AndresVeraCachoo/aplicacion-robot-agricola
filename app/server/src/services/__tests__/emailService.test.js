import { jest } from '@jest/globals';
import { sendWelcomeEmail, sendSupportTicket, sendReportEmail, transporter } from '../emailService.js';
import { env } from '../../config/env.js';

describe('EmailService', () => {
  let sendMailSpy;

  beforeAll(() => {
    // Espiamos el método sendMail del transporter real (que está en modo jsonTransport)
    sendMailSpy = jest.spyOn(transporter, 'sendMail');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('Debería enviar un correo de bienvenida con usuario y contraseña', async () => {
      await sendWelcomeEmail('user@test.com', 'pepe', '123456');

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      
      const callArg = sendMailSpy.mock.calls[0][0];
      expect(callArg.to).toBe('user@test.com');
      expect(callArg.subject).toContain('Bienvenido a AgroSkopos');
      expect(callArg.html).toContain('pepe');
      expect(callArg.html).toContain('123456');
    });
  });

  describe('sendSupportTicket', () => {
    it('Debería enviar correo usando ADMIN_EMAIL si no hay correos en adminEmails y el usuario tiene un email real', async () => {
      // Forzamos env temporalmente para la prueba
      const originalAdmin = env.ADMIN_EMAIL;
      env.ADMIN_EMAIL = 'admin@agro.com';
      
      await sendSupportTicket('usuario@real.com', 'robot', 'No funciona el robot', []);

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendMailSpy.mock.calls[0][0];
      
      expect(callArg.to).toBe('admin@agro.com');
      expect(callArg.from).toBe(`"usuario@real.com" <${env.EMAIL_USER}>`);
      expect(callArg.replyTo).toBe('usuario@real.com');
      expect(callArg.subject).toContain('[ROBOT]');
      expect(callArg.html).toContain('No funciona el robot');
      expect(callArg.html).toContain('responder directamente');
      
      env.ADMIN_EMAIL = originalAdmin;
    });

    it('Debería usar un from genérico y no replyTo si el email del usuario es @sistema.local', async () => {
      await sendSupportTicket('juan@sistema.local', 'app', 'Error de app', ['admin1@agro.com', 'admin2@agro.com']);

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendMailSpy.mock.calls[0][0];
      
      expect(callArg.to).toBe('admin1@agro.com, admin2@agro.com'); // Admin emails de la BD
      expect(callArg.from).toBe(`"AgroSkopos Soporte" <${env.EMAIL_USER}>`);
      expect(callArg.replyTo).toBeUndefined();
      expect(callArg.subject).toContain('[APP]');
      expect(callArg.html).toContain('juan@sistema.local');
      expect(callArg.html).not.toContain('responder directamente');
    });
  });

  describe('sendReportEmail', () => {
    it('Debería enviar un archivo adjunto base64 limpiando el prefijo si existe', async () => {
      const b64Data = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTG...';
      
      await sendReportEmail('reportes@user.com', b64Data, 'export.pdf', 'application/pdf');

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendMailSpy.mock.calls[0][0];
      
      expect(callArg.to).toBe('reportes@user.com');
      expect(callArg.subject).toContain('export.pdf');
      
      expect(callArg.attachments).toBeDefined();
      expect(callArg.attachments.length).toBe(1);
      expect(callArg.attachments[0].filename).toBe('export.pdf');
      expect(callArg.attachments[0].contentType).toBe('application/pdf');
      expect(callArg.attachments[0].content).toMatch(/^JVBERi/);
    });

    it('Debería adjuntar el archivo base64 puro si no tiene prefijo', async () => {
      const pureB64 = 'cHVyZSBkYXRh';
      
      await sendReportEmail('reportes2@user.com', pureB64, 'export.csv', 'text/csv');

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendMailSpy.mock.calls[0][0];
      
      expect(callArg.attachments[0].content).toBe(pureB64);
      expect(callArg.attachments[0].contentType).toBe('text/csv');
    });
  });
});
