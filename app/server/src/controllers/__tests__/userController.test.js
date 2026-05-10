// server/src/controllers/__tests__/userController.test.js
import { jest } from '@jest/globals';

describe('User Controller', () => {
  let mockQuery, mockHash, mockCompare;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();
    mockQuery = jest.fn();
    mockHash = jest.fn();
    mockCompare = jest.fn();

    req = { params: {}, body: {}, user: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: mockHash, compare: mockCompare },
    }));
  });

  describe('getProfile', () => {
    it('Debe devolver 404 si el usuario no existe', async () => {
      req.user = { id: 99 };
      mockQuery.mockResolvedValueOnce({ rows: [] }); 

      const { getProfile } = await import('../userController.js');
      await getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado" });
    });

    it('Debe devolver el perfil si existe', async () => {
      req.user = { id: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Admin', role: 'admin' }] });

      const { getProfile } = await import('../userController.js');
      await getProfile(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Admin', role: 'admin' });
    });
  });

  describe('updatePassword', () => {
    it('Debe bloquear si faltan contraseñas', async () => {
      req.body = { currentPassword: '123' }; 
      req.user = { id: 1 };
      const { updatePassword } = await import('../userController.js');
      await updatePassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe bloquear si el usuario no existe', async () => {
      req.body = { currentPassword: '123', newPassword: '321' };
      req.user = { id: 99 };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { updatePassword } = await import('../userController.js');
      await updatePassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe bloquear si la contraseña actual es incorrecta', async () => {
      req.body = { currentPassword: 'mala', newPassword: '321' };
      req.user = { id: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password: 'hashed' }] });
      mockCompare.mockResolvedValueOnce(false); 

      const { updatePassword } = await import('../userController.js');
      await updatePassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe actualizar la contraseña si es correcta', async () => {
      req.body = { currentPassword: 'buena', newPassword: '321' };
      req.user = { id: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password: 'hashed' }] });
      mockCompare.mockResolvedValueOnce(true); 
      mockHash.mockResolvedValueOnce('new-hashed');

      const { updatePassword } = await import('../userController.js');
      await updatePassword(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ message: "Contraseña actualizada correctamente" });
    });
  });

  describe('getUsers & createUser', () => {
    it('getUsers devuelve lista de usuarios', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const { getUsers } = await import('../userController.js');
      await getUsers(req, res, next);
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('createUser bloquea si faltan datos', async () => {
      req.body = { name: 'Pepe' }; 
      const { createUser } = await import('../userController.js');
      await createUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('createUser bloquea si el usuario ya existe', async () => {
      req.body = { name: 'Pepe', role: 'operador', password: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); 
      const { createUser } = await import('../userController.js');
      await createUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('createUser crea usuario con éxito', async () => {
      req.body = { name: 'Pepe', role: 'operador', password: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [] }); 
      mockHash.mockResolvedValueOnce('hashed-pwd');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, name: 'Pepe' }] });

      const { createUser } = await import('../userController.js');
      await createUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateUser', () => {
    it('Debe actualizar nombre y rol sin cambiar contraseña si no se manda', async () => {
      req.params.id = 5;
      req.body = { name: 'Pepe2', role: 'admin' }; 
      // FUNDAMENTAL: Simular que la base de datos actualizó 1 fila
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const { updateUser } = await import('../userController.js');
      await updateUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: "Usuario actualizado" });
    });

    it('Debe actualizar también la contraseña si se manda', async () => {
      req.params.id = 5;
      req.body = { name: 'Pepe2', role: 'admin', password: 'new' };
      mockHash.mockResolvedValueOnce('hashed-new');
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const { updateUser } = await import('../userController.js');
      await updateUser(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
        ['Pepe2', 'admin', 'hashed-new', 5]
      );
    });

    it('Debe devolver 404 si el usuario a actualizar no existe', async () => {
      req.params.id = 99;
      req.body = { name: 'Fantasma', role: 'operador' };
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // Ninguna fila afectada

      const { updateUser } = await import('../userController.js');
      await updateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado" });
    });
  });

  describe('deleteUser & updateAvatar', () => {
    it('deleteUser deniega borrado de IDs 1, 2, 3', async () => {
      req.params.id = "1";
      const { deleteUser } = await import('../userController.js');
      await deleteUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('deleteUser devuelve 404 si el usuario no existe', async () => {
      req.params.id = "99";
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const { deleteUser } = await import('../userController.js');
      await deleteUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deleteUser deniega si es el último administrador', async () => {
      req.params.id = "4";
      mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] }); // Es admin
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Solo queda 1

      const { deleteUser } = await import('../userController.js');
      await deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('deleteUser borra correctamente a un usuario', async () => {
      req.params.id = "5";
      mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operador' }] });
      
      const { deleteUser } = await import('../userController.js');
      await deleteUser(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuario eliminado correctamente" });
    });

    it('updateAvatar bloquea si falta la URL', async () => {
      req.body = {};
      req.user = { id: 1 };
      const { updateAvatar } = await import('../userController.js');
      await updateAvatar(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updateAvatar devuelve 404 si el usuario no existe', async () => {
      req.body = { avatarUrl: 'http://foto.png' };
      req.user = { id: 99 };
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE no devolvió nada

      const { updateAvatar } = await import('../userController.js');
      await updateAvatar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updateAvatar actualiza el avatar con éxito', async () => {
      req.body = { avatarUrl: 'http://foto.png' };
      req.user = { id: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, avatar: 'http://foto.png' }] });

      const { updateAvatar } = await import('../userController.js');
      await updateAvatar(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Avatar actualizado" }));
    });
  });
});