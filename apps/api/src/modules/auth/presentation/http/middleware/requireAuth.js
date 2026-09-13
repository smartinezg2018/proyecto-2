import { UserRepository } from '../../../../administration/infrastructure/userRepository.js';
import { AuthorizationRepository } from '../../../infrastructure/authorizationRepository.js';
import { sessionStore } from '../../../infrastructure/sessionStore.js';
import { readSessionCookie } from '../cookie.js';

const defaultUsers = new UserRepository();
const defaultAuthz = new AuthorizationRepository();

export function createRequireAuth({
  sessions = sessionStore,
  users = defaultUsers,
  authorization = defaultAuthz
} = {}) {
  return async function requireAuth(request, response, next) {
    try {
      const sessionId = readSessionCookie(request);
      const userId = sessions.get(sessionId);
      if (!userId) {
        response.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'La sesión no es válida.',
            requestId: request.id
          }
        });
        return;
      }
      const user = await users.findById(userId);
      if (!user || user.status !== 'active') {
        response.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'La sesión no es válida.',
            requestId: request.id
          }
        });
        return;
      }
      const permissions = await authorization.findEffectivePermissions(userId);
      request.user = { ...user, permissions };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();
