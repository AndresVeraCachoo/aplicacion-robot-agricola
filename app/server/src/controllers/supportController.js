import { emailQueue } from "../workers/emailWorker.js";

export class SupportController {
  /**
   * @param {Object} prisma - Cliente de Prisma para consultar la BD.
   */
  constructor(prisma) {
    this.prisma = prisma;
  }

  createTicket = async (req, res, next) => {
    try {
      const { type, description } = req.body;

      // Usamos directamente el email del token JWT o un fallback
      const userEmail = req.user.email || `${req.user.name}@sistema.local`;

      // Buscar todos los correos de los usuarios administradores
      const admins = await this.prisma.user.findMany({
        where: { 
          role: 'admin',
          email: { not: null }
        },
        select: { email: true }
      });
      
      const adminEmails = admins.map(a => a.email).filter(e => e.trim() !== "");

      // Si no hay administradores con correo en la BD, se intenta usar el de .env
      if (adminEmails.length === 0 && process.env.ADMIN_EMAIL) {
        adminEmails.push(process.env.ADMIN_EMAIL);
      }

      await emailQueue.add('supportTicket', {
        type: 'SUPPORT_TICKET',
        payload: { email: userEmail, issueType: type, description, adminEmails }
      });

      res.status(202).json({ message: "Ticket encolado correctamente" });
    } catch (error) {
      next(error);
    }
  };
}
