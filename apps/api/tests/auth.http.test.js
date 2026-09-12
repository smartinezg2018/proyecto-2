import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';
import { hashPassword } from '../src/modules/auth/infrastructure/password.js';

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0];
}

test('HTTP: login valida credenciales y estado, y logout revoca la sesión', async (t) => {
  const passwordHash = await hashPassword('correcta-123');
  const activeUser = {
    id: 1,
    identification: '123',
    name: 'Juan',
    email: 'juan@email.com',
    status: 'active',
    passwordHash
  };
  const inactiveUser = { ...activeUser, id: 2, email: 'inactivo@email.com', status: 'inactive' };
  t.mock.method(UserRepository.prototype, 'findByEmail', async (email) => {
    if (email === activeUser.email) return activeUser;
    if (email === inactiveUser.email) return inactiveUser;
    return null;
  });
  t.mock.method(UserRepository.prototype, 'findById', async (id) => (id === 1 ? activeUser : null));

  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/auth`;
    const postLogin = (body) =>
      fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

    const success = await postLogin({ email: activeUser.email, password: 'correcta-123' });
    assert.equal(success.status, 200);
    const sessionCookie = cookieFrom(success);
    assert.match(sessionCookie, /^building_management_session=/);
    assert.match(success.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await success.json()).data.user.passwordHash, undefined);

    const current = await fetch(`${baseUrl}/me`, { headers: { Cookie: sessionCookie } });
    assert.equal(current.status, 200);
    assert.equal((await current.json()).data.user.email, activeUser.email);

    for (const body of [
      { email: activeUser.email, password: 'incorrecta' },
      { email: 'missing@email.com', password: 'correcta-123' }
    ]) {
      const invalid = await postLogin(body);
      assert.equal(invalid.status, 401);
      assert.equal((await invalid.json()).error.code, 'INVALID_CREDENTIALS');
    }

    const inactive = await postLogin({ email: inactiveUser.email, password: 'correcta-123' });
    assert.equal(inactive.status, 403);
    assert.equal((await inactive.json()).error.code, 'INACTIVE_USER');

    const logout = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });
    assert.equal(logout.status, 200);
    const afterLogout = await fetch(`${baseUrl}/me`, { headers: { Cookie: sessionCookie } });
    assert.equal(afterLogout.status, 401);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
