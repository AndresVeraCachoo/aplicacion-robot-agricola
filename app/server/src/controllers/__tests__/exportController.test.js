import { jest } from '@jest/globals';
import { ExportController } from '../exportController.js';
import { emailQueue } from '../../workers/emailWorker.js';

jest.spyOn(emailQueue, 'add').mockResolvedValue(true);

describe('ExportController', () => {
  let exportController;
  let req;
  let res;
  let next;

  beforeEach(() => {
    exportController = new ExportController();
    req = {
      body: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('emailReport', () => {
    it('Debería retornar 400 si el usuario no tiene email configurado', async () => {
      req.user = { id: 1, name: 'testuser' }; // sin email
      req.body = { fileBase64: 'base64...', filename: 'test.pdf', fileType: 'application/pdf' };

      await exportController.emailReport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it('Debería encolar el trabajo y retornar 202 si los datos son correctos', async () => {
      req.user = { id: 1, email: 'test@example.com' };
      req.body = { fileBase64: 'base64...', filename: 'test.pdf', fileType: 'application/pdf' };

      await exportController.emailReport(req, res, next);

      expect(emailQueue.add).toHaveBeenCalledWith('exportReport', {
        type: 'EXPORT_REPORT',
        payload: {
          email: 'test@example.com',
          fileBase64: 'base64...',
          filename: 'test.pdf',
          fileType: 'application/pdf'
        }
      });
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });

    it('Debería llamar a next(error) si ocurre una excepción', async () => {
      req.user = { id: 1, email: 'test@example.com' };
      req.body = { fileBase64: 'base64...', filename: 'test.pdf', fileType: 'application/pdf' };
      
      const error = new Error('Queue error');
      emailQueue.add.mockRejectedValueOnce(error);

      await exportController.emailReport(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
