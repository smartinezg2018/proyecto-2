export const SESSION_COOKIE_NAME = 'building_management_session';

export function readSessionCookie(request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .find((value) => value.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(SESSION_COOKIE_NAME.length + 1)) : null;
}

export function serializeSessionCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAge / 1000)}; HttpOnly; SameSite=Lax; Path=/${secure}`;
}
