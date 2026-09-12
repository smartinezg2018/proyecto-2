import { randomBytes } from 'node:crypto';

const sessions = new Map();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const sessionStore = {
  create(userId) {
    const sessionId = randomBytes(32).toString('hex');
    sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_DURATION_MS });
    return sessionId;
  },
  get(sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) sessions.delete(sessionId);
      return null;
    }
    return session.userId;
  },
  delete(sessionId) {
    if (sessionId) sessions.delete(sessionId);
  }
};

export const sessionMaxAge = SESSION_DURATION_MS;