import { emailQueue } from "../workers/emailWorker.js";

export class SupportController {
  createTicket = async (req, res, next) => {
    try {
      const { type, description } = req.body;
      const userEmail = req.user.email || req.user.name + "@sistema.local"; // Fallback if user has no email

      await emailQueue.add('supportTicket', {
        type: 'SUPPORT_TICKET',
        payload: { email: userEmail, issueType: type, description }
      });

      res.status(202).json({ message: "Ticket encolado correctamente" });
    } catch (error) {
      next(error);
    }
  };
}
