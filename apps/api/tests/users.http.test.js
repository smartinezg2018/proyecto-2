import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';

test('HTTP: registro 201, validación 400, duplicados 409 y errores 500', async (t) => {
  const users = [];
  t.mock.method(UserRepository.prototype, 'findByEmail', async (email) =>
    users.find((user) => user.email === email)
  );
  t.mock.method(UserRepository.prototype, 'findByIdentification', async (id) =>
    users.find((user) => user.identification === id)
  );
  const create = t.mock.method(UserRepository.prototype, 'create', async (user) => {
    const created = { id: users.length + 1, ...user };
    users.push(created);
    return created;
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const input = {
      identification: '123',
      name: 'Juan',
      email: 'juan@email.com',
      status: 'active'
    };
    const post = (body) =>
      fetch(`${baseUrl}/api/v1/administration/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    const success = await post(input);
    assert.equal(success.status, 201);
    const payload = await success.json();
    assert.deepEqual(payload.data, { id: 1, ...input, createdBy: null });
    assert.ok(payload.meta.requestId);
    for (const [body, status, code] of [
      [{ ...input, name: '' }, 400, 'VALIDATION_ERROR'],
      [{ ...input, identification: '456' }, 409, 'DUPLICATE_USER_EMAIL'],
      [{ ...input, email: 'otro@email.com' }, 409, 'DUPLICATE_USER_IDENTIFICATION']
    ]) {
      const response = await post(body);
      assert.equal(response.status, status);
      const error = (await response.json()).error;
      assert.equal(error.code, code);
      assert.ok(error.requestId);
    }
    create.mock.mockImplementation(async () => {
      throw new Error('Internal database details');
    });
    const failure = await post({ ...input, identification: '999', email: 'nuevo@email.com' });
    assert.equal(failure.status, 500);
    assert.equal((await failure.json()).error.message, 'Error interno del servidor.');
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).data.status, 'ok');
    assert.equal(users.length, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
