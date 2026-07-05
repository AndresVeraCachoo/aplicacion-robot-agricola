import { jest } from '@jest/globals';
import { SupportController } from '../supportController.js';
import { emailQueue } from '../../workers/emailWorker.js';

jest.spyOn(emailQueue, 'add').mockResolvedValue(true);

describe('SupportController', () => {
  let supportController;
  let mockPrisma;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn()
      }
    };
    supportController = new SupportController(mockPrisma);
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
    
    // Configurar process.env.ADMIN_EMAIL para tests
    process.env.ADMIN_EMAIL = 'admin_env@example.com';
  });

  describe('createTicket', () => {
    it('Debería encolar ticket con los correos de admins obtenidos de Prisma y devolver 202', async () => {
      req.user = { email: 'usuario@correo.com' };
      req.body = { type: 'robot', description: 'Problema de prueba' };
      
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { email: 'admin1@admin.com' },
        { email: 'admin2@admin.com' },
        { email: ' ' } // Correo vacío que debe filtrarse
      ]);

      await supportController.createTicket(req, res, next);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin', email: { not: null } },
        select: { email: true }
      });
      
      expect(emailQueue.add).toHaveBeenCalledWith('supportTicket', {
        type: 'SUPPORT_TICKET',
        payload: {
          email: 'usuario@correo.com',
          issueType: 'robot',
          description: 'Problema de prueba',
          adminEmails: ['admin1@admin.com', 'admin2@admin.com']
        }
      });
      
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });

    it('Debería usar un email temporal y el fallback en .env si no hay correo y no hay admins en BD', async () => {
      req.user = { name: 'Pepe' }; // Sin email real
      req.body = { type: 'app', description: 'Ayuda' };
      
      mockPrisma.user.findMany.mockResolvedValueOnce([]); // Sin admins en BD

      await supportController.createTicket(req, res, next);

      expect(emailQueue.add).toHaveBeenCalledWith('supportTicket', {
        type: 'SUPPORT_TICKET',
        payload: {
          email: 'Pepe@sistema.local', // Fallback
          issueType: 'app',
          description: 'Ayuda',
          adminEmails: ['admin_env@example.com'] // Fallback env
        }
      });
      
      expect(res.status).toHaveBeenCalledWith(202);
    });

    it('Debería llamar a next(error) si ocurre un fallo interno', async () => {
      req.user = { email: 'user@test.com' };
      req.body = { type: 'other', description: 'Error' };
      
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findMany.mockRejectedValueOnce(dbError);

      await supportController.createTicket(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
