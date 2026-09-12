import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileRepository } from '../src/modules/administration/infrastructure/profileRepository.js';

test('rechaza permisos inexistentes sin insertar un perfil y libera la conexión', async () => {
  const events = [];
  const connection = {
    async beginTransaction() {
      events.push('begin');
    },
    async execute() {
      events.push('select');
      return [[{ id: 1 }]];
    },
    async rollback() {
      events.push('rollback');
    },
    release() {
      events.push('release');
    }
  };
  const repository = new ProfileRepository({
    async getConnection() {
      return connection;
    }
  });
  await assert.rejects(
    () =>
      repository.create({
        name: 'Perfil',
        description: null,
        permissionIds: [1, 999],
        createdBy: null
      }),
    { code: 'INVALID_PERMISSIONS', statusCode: 400 }
  );
  assert.deepEqual(events, ['begin', 'select', 'rollback', 'release']);
});

test('revierte la transacción si falla la escritura de una asociación', async () => {
  const events = [];
  const failure = new Error('Database unavailable');
  const connection = {
    async beginTransaction() {
      events.push('begin');
    },
    async execute(sql) {
      if (sql.startsWith('SELECT id FROM permissions')) return [[{ id: 1 }]];
      if (sql.startsWith('INSERT INTO profiles')) {
        events.push('profile');
        return [{ insertId: 10 }];
      }
      throw failure;
    },
    async commit() {
      events.push('commit');
    },
    async rollback() {
      events.push('rollback');
    },
    release() {
      events.push('release');
    }
  };
  const repository = new ProfileRepository({
    async getConnection() {
      return connection;
    }
  });
  await assert.rejects(
    () =>
      repository.create({
        name: 'Perfil',
        description: null,
        permissionIds: [1],
        createdBy: null
      }),
    (error) => error === failure
  );
  assert.deepEqual(events, ['begin', 'profile', 'rollback', 'release']);
});
