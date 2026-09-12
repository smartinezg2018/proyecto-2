import { Router } from 'express';
import { UserRepository } from '../../../administration/infrastructure/userRepository.js';
import { createAuthUseCases } from '../../application/authUseCases.js';
import { sessionMaxAge, sessionStore } from '../../infrastructure/sessionStore.js';

export const authRoutes = Router();
const authUseCases = createAuthUseCases(new UserRepository(), sessionStore);
const COOKIE_NAME = 'building_management_session';

authRoutes.post('/login', asyncHandler(async (request, response) => {
  const { sessionId, user } = await authUseCases.login(request.body?.email, request.body?.password);
  response.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, sessionId, sessionMaxAge));
  response.json({ data: { user }, meta: { requestId: request.id } });
}));

authRoutes.post('/logout', asyncHandler(async (request, response) => {
  authUseCases.logout(readCookie(request, COOKIE_NAME));
  response.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, '', 0));
  response.json({ data: { loggedOut: true }, meta: { requestId: request.id } });
}));

authRoutes.get('/me', asyncHandler(async (request, response) => {
  const user = await authUseCases.currentUser(readCookie(request, COOKIE_NAME));
  if (!user) {
    response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'La sesión no es válida.', requestId: request.id } });
    return;
  }
  response.json({ data: { user }, meta: { requestId: request.id } });
}));

function readCookie(request, name) {
  const cookie = request.headers.cookie?.split(';').find((value) => value.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
}

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function serializeCookie(name, value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAge / 1000)}; HttpOnly; SameSite=Lax; Path=/${secure}`;
}