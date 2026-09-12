import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserUseCases } from '../src/modules/administration/application/userUseCases.js';

const input = { identification: '123456789', name: 'Juan Pérez', email: 'juan@email.com', status: 'active' };

function createRepository() {
  const users = [];
  return {
    users,
    async findByEmail(email) { return users.find((user) => user.email === email) ?? null; },
    async findByIdentification(identification) { return users.find((user) => user.identification === identification) ?? null; },
    async create(user) {
      const created = { id: users.length + 1, ...user };
      users.push(created);
      return created;
    }
  };
}

test('registra los cuatro campos del usuario y conserva el creador', async () => {
  const repository = createRepository();
  const user = await createUserUseCases(repository).create(input, 7);
  assert.deepEqual(user, { id: 1, ...input, createdBy: 7 });
  assert.deepEqual(repository.users, [user]);
});

test('normaliza espacios y correo y permite registrar un usuario inactivo', async () => {
  const user = await createUserUseCases(createRepository()).create({
    identification: ' 00123 ', name: ' Juan Pérez ', email: ' JUAN@EMAIL.COM ', status: 'inactive'
  });
  assert.equal(user.identification, '00123');
  assert.equal(user.name, 'Juan Pérez');
  assert.equal(user.email, input.email);
  assert.equal(user.status, 'inactive');
  assert.equal(user.createdBy, null);
});

test('rechaza el correo duplicado incluso con mayúsculas y espacios', async () => {
  const repository = createRepository();
  const useCases = createUserUseCases(repository);
  await useCases.create(input);
  await assert.rejects(() => useCases.create({ ...input, identification: '999', email: ' JUAN@EMAIL.COM ' }), {
    code: 'DUPLICATE_USER_EMAIL', statusCode: 409
  });
  assert.equal(repository.users.length, 1);
});

test('rechaza la identificación duplicada aunque el correo sea diferente', async () => {
  const repository = createRepository();
  const useCases = createUserUseCases(repository);
  await useCases.create(input);
  await assert.rejects(() => useCases.create({ ...input, identification: ' 123456789 ', email: 'otro@email.com' }), {
    code: 'DUPLICATE_USER_IDENTIFICATION', statusCode: 409
  });
  assert.equal(repository.users.length, 1);
});

test('valida todos los campos obligatorios y sus límites antes de consultar la base', async () => {
  const useCases = createUserUseCases({});
  for (const invalidInput of [undefined, null, {}, [], 'texto']) {
    await assert.rejects(() => useCases.create(invalidInput), { code: 'VALIDATION_ERROR', statusCode: 400 });
  }
  for (const [field, maxLength] of [['identification', 50], ['name', 150], ['email', 150]]) {
    for (const value of [undefined, null, '', '   ', 123, {}, [], 'a'.repeat(maxLength + 1)]) {
      await assert.rejects(() => useCases.create({ ...input, [field]: value }), {
        code: 'VALIDATION_ERROR', statusCode: 400
      });
    }
  }
  for (const status of [undefined, null, '', 'pending', 'activo', 1, true]) {
    await assert.rejects(() => useCases.create({ ...input, status }), { code: 'VALIDATION_ERROR', statusCode: 400 });
  }
});
