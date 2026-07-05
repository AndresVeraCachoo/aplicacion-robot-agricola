import { emailQueue } from "../workers/emailWorker.js";

export class ExportController {
  emailReport = async (req, res, next) => {
    try {
      const { fileBase64, filename, fileType } = req.body;
      const userEmail = req.user.email;

      if (!userEmail) {
        return res.status(400).json({ error: "El usuario actual no tiene un correo electrónico configurado." });
      }

      await emailQueue.add('exportReport', {
        type: 'EXPORT_REPORT',
        payload: { 
          email: userEmail,
          fileBase64,
          filename,
          fileType
        }
      });

      res.status(202).json({ message: "El reporte ha sido encolado y se enviará en breve." });
    } catch (error) {
      next(error);
    }
  };
}
