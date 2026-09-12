import test from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';

const user = { identification: '123', name: 'Juan', email: 'juan@email.com', status: 'active', createdBy: null };

test('traduce violaciones de unicidad de MySQL a errores 409', async () => {
  for (const [key, code] of [
    ['uq_users_email', 'DUPLICATE_USER_EMAIL'],
    ['uq_users_identification', 'DUPLICATE_USER_IDENTIFICATION']
  ]) {
    const repository = new UserRepository({
      async execute() {
        throw Object.assign(new Error('Duplicate'), {
          code: 'ER_DUP_ENTRY', sqlMessage: `Duplicate entry 'uq_users_email' for key 'users.${key}'`
        });
      }
    });
    await assert.rejects(() => repository.create(user), { code, statusCode: 409 });
  }
});

test('propaga fallos inesperados de MySQL al middleware existente', async () => {
  const failure = Object.assign(new Error('Database unavailable'), { code: 'ECONNREFUSED' });
  const repository = new UserRepository({ async execute() { throw failure; } });
  await assert.rejects(() => repository.create(user), (error) => error === failure);
});
