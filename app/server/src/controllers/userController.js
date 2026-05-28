export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  getProfile = async (req, res, next) => {
    try {
      const profile = await this.userService.getUserProfile(req.user.id);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updatePassword = async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.userService.updateUserPassword(req.user.id, currentPassword, newPassword);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req, res, next) => {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req, res, next) => {
    try {
      const { name, role, password } = req.body;
      const newUser = await this.userService.createNewUser(name, role, password);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, role, password } = req.body;
      const result = await this.userService.updateExistingUser(id, name, role, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.userService.deleteExistingUser(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateAvatar = async (req, res, next) => {
    try {
      const { avatarUrl } = req.body;
      const result = await this.userService.updateUserAvatar(req.user.id, avatarUrl);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}