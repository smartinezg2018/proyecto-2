import { Router } from 'express';
import { UserRepository } from '../../../administration/infrastructure/userRepository.js';
import { createAuthUseCases } from '../../application/authUseCases.js';
import { AuthorizationRepository } from '../../infrastructure/authorizationRepository.js';
import { sessionMaxAge, sessionStore } from '../../infrastructure/sessionStore.js';
import {
  readSessionCookie,
  serializeSessionCookie
} from './cookie.js';
import { requireAuth } from './middleware/requireAuth.js';

export const authRoutes = Router();
const authUseCases = createAuthUseCases(new UserRepository(), sessionStore);
const authorizationRepository = new AuthorizationRepository();

authRoutes.post(
  '/login',
  asyncHandler(async (request, response) => {
    const { sessionId, user } = await authUseCases.login(
      request.body?.email,
      request.body?.password
    );
    const permissions = await authorizationRepository.findEffectivePermissions(user.id);
    response.setHeader('Set-Cookie', serializeSessionCookie(sessionId, sessionMaxAge));
    response.json({ data: { user: { ...user, permissions } }, meta: { requestId: request.id } });
  })
);

authRoutes.post(
  '/logout',
  asyncHandler(async (request, response) => {
    authUseCases.logout(readSessionCookie(request));
    response.setHeader('Set-Cookie', serializeSessionCookie('', 0));
    response.json({ data: { loggedOut: true }, meta: { requestId: request.id } });
  })
);

authRoutes.get(
  '/me',
  asyncHandler(async (request, response) => {
    const user = await authUseCases.currentUser(readSessionCookie(request));
    if (!user) {
      response.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'La sesión no es válida.',
          requestId: request.id
        }
      });
      return;
    }
    const permissions = await authorizationRepository.findEffectivePermissions(user.id);
    response.json({
      data: { user: { ...user, permissions } },
      meta: { requestId: request.id }
    });
  })
);

authRoutes.get(
  '/buildings',
  requireAuth,
  asyncHandler(async (request, response) => {
    const permissions = request.user.permissions ?? [];
    const buildings = permissions.includes('admin.all')
      ? await authorizationRepository.findAllBuildings()
      : await authorizationRepository.findAssignedBuildings(request.user.id);
    response.json({
      data: buildings,
      meta: { requestId: request.id, page: 1, pageSize: buildings.length }
    });
  })
);

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}