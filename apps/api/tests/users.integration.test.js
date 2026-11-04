import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createUserUseCases } from '../src/modules/administration/application/userUseCases.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

test('MySQL: persiste usuarios y protege correo e identificación en concurrencia', async () => {
  const h = await createIntegrationHarness('users');
  try {
    const repository = new UserRepository(h.database);
    const useCases = createUserUseCases(repository);
    const token = randomUUID();
    const input = {
      identification: token,
      name: 'Juan Pérez',
      email: `${token}@example.com`,
      status: 'active'
    };
    const user = await useCases.create(input, 7);
    const [rows] = await h.database.execute(
      'SELECT identification, name, email, status, created_by, updated_by FROM users WHERE id = ?',
      [user.id]
    );
    for (const [field, value] of Object.entries(input)) assert.equal(rows[0][field], value);
    assert.equal(rows[0].created_by, 7);
    assert.equal(rows[0].updated_by, 7);

    for (const [changes, code] of [
      [
        { identification: `${token}-other`, email: input.email.toUpperCase() },
        'DUPLICATE_USER_EMAIL'
      ],
      [{ email: `other-${input.email}` }, 'DUPLICATE_USER_IDENTIFICATION']
    ]) {
      await assert.rejects(() => useCases.create({ ...input, ...changes }), {
        code,
        statusCode: 409
      });
    }

    for (const [field, code] of [
      ['email', 'DUPLICATE_USER_EMAIL'],
      ['identification', 'DUPLICATE_USER_IDENTIFICATION']
    ]) {
      const common = field === 'email' ? `${token}-race@example.com` : `${token}-race`;
      const attempts = [1, 2].map((index) => ({
        ...input,
        identification: `${token}-${index}`,
        email: `${token}-${field}-${index}@example.com`,
        status: 'inactive',
        createdBy: null,
        [field]: common
      }));
      const results = await Promise.allSettled(
        attempts.map((attempt) => repository.create(attempt))
      );
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      const failure = results.find((result) => result.status === 'rejected').reason;
      assert.equal(failure.code, code);
      assert.equal(failure.statusCode, 409);
    }
    await assert.rejects(
      () =>
        h.database.execute(
          'INSERT INTO users (identification, name, email, status) VALUES (?, ?, ?, ?)',
          [`${token}-invalid`, 'Inválido', `${token}-invalid@example.com`, 'unknown']
        ),
      { code: 'ER_CHECK_CONSTRAINT_VIOLATED' }
    );
  } finally {
    await h.close();
  }
});
