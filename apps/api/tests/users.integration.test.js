import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';
import { createUserUseCases } from '../src/modules/administration/application/userUseCases.js';

test('MySQL: persiste usuarios y protege correo e identificación incluso en registros simultáneos', {
  skip: !process.env.TEST_DB_NAME && 'Configura TEST_DB_NAME con una base MySQL exclusiva para pruebas'
}, async () => {
  assert.notEqual(process.env.TEST_DB_NAME, env.database.name, 'Usa una base distinta de la aplicación');
  const pool = mysql.createPool({
    host: env.database.host, port: env.database.port, user: env.database.user,
    password: env.database.password, database: process.env.TEST_DB_NAME
  });
  const token = randomUUID();
  const createdIds = [];
  try {
    const migration = await fs.readFile(new URL('../database/migrations/003_users.sql', import.meta.url), 'utf8');
    for (let run = 0; run < 2; run += 1) {
      for (const statement of migration.split(';').filter((sql) => sql.trim())) await pool.query(statement);
    }
    const repository = new UserRepository(pool);
    const useCases = createUserUseCases(repository);
    const input = { identification: token, name: 'Juan Pérez', email: `${token}@example.com`, status: 'active' };
    const user = await useCases.create(input, 7);
    createdIds.push(user.id);
    const [rows] = await pool.execute(
      'SELECT identification, name, email, status, created_by, updated_by FROM users WHERE id = ?', [user.id]
    );
    for (const [field, value] of Object.entries(input)) assert.equal(rows[0][field], value);
    assert.equal(rows[0].created_by, 7);
    assert.equal(rows[0].updated_by, 7);
    assert.equal(user.createdBy, 7);
    assert.ok(user.createdAt);
    assert.ok(user.updatedAt);

    for (const [changes, code] of [
      [{ identification: `${token}-other`, email: input.email.toUpperCase() }, 'DUPLICATE_USER_EMAIL'],
      [{ email: `other-${input.email}` }, 'DUPLICATE_USER_IDENTIFICATION']
    ]) {
      await assert.rejects(() => useCases.create({ ...input, ...changes }), { code, statusCode: 409 });
    }

    // Se omite la consulta previa para comprobar la protección real de los índices únicos.
    for (const [field, code] of [['email', 'DUPLICATE_USER_EMAIL'], ['identification', 'DUPLICATE_USER_IDENTIFICATION']]) {
      const common = field === 'email' ? `${token}-race@example.com` : `${token}-race`;
      const attempts = [1, 2].map((index) => ({
        ...input, identification: `${token}-${index}`,
        email: `${token}-${field}-${index}@example.com`, status: 'inactive', createdBy: null, [field]: common
      }));
      const results = await Promise.allSettled(attempts.map((attempt) => repository.create(attempt)));
      const saved = results.filter((result) => result.status === 'fulfilled');
      createdIds.push(...saved.map((result) => result.value.id));
      assert.equal(saved.length, 1);
      const failure = results.find((result) => result.status === 'rejected').reason;
      assert.equal(failure.code, code);
      assert.equal(failure.statusCode, 409);
      assert.equal(saved[0].value.status, 'inactive');
    }
    await assert.rejects(() => pool.execute(
      'INSERT INTO users (identification, name, email, status) VALUES (?, ?, ?, ?)',
      [`${token}-invalid`, 'Inválido', `${token}-invalid@example.com`, 'unknown']
    ), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  } finally {
    try {
      for (const id of createdIds) await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    } finally {
      await pool.end();
    }
  }
});
