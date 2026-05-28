// Usamos Arrow Functions (= async) para evitar perder el 'this' en Express
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  login = async (req, res, next) => {
    try {
      // Zod ya nos garantiza que 'name' y 'password' existen y son válidos
      const { name, password } = req.body; 
      
      const authData = await this.authService.loginUser(name, password);
      
      res.json(authData);
    } catch (error) {
      next(error);
    }
  };

  verify = (req, res) => {
    res.json({ valid: true, user: req.user });
  };
}