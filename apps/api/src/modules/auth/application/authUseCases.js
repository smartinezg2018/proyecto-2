import { AppError } from '../../../shared/errors/AppError.js';
import { verifyPassword } from '../infrastructure/password.js';

const INVALID_CREDENTIALS = 'Credenciales inválidas';

export function createAuthUseCases(repository, sessions) {
  return {
    async login(email, password) {
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        throw new AppError(INVALID_CREDENTIALS, 401, 'INVALID_CREDENTIALS');
      }

      const user = await repository.findByEmail(email.trim().toLowerCase());
      const passwordMatches = user && (await verifyPassword(password, user.passwordHash));
      if (!user || !passwordMatches) {
        throw new AppError(INVALID_CREDENTIALS, 401, 'INVALID_CREDENTIALS');
      }
      if (user.status !== 'active') {
        throw new AppError('El usuario está inactivo.', 403, 'INACTIVE_USER');
      }

      const sessionId = sessions.create(user.id);
      return { sessionId, user: sanitizeUser(user) };
    },

    logout(sessionId) {
      sessions.delete(sessionId);
    },

    currentUser(sessionId) {
      const userId = sessions.get(sessionId);
      return userId ? repository.findById(userId).then((user) => (user ? sanitizeUser(user) : null)) : null;
    }
  };
}

function sanitizeUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}