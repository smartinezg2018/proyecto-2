import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { ProfileRepository } from '../src/modules/administration/infrastructure/profileRepository.js';
import { createProfileUseCases } from '../src/modules/administration/application/profileUseCases.js';

test('persiste perfiles y asociaciones en MySQL y rechaza permisos inexistentes', {
  skip: !process.env.TEST_DB_NAME && 'Configura TEST_DB_NAME con una base MySQL exclusiva para pruebas'
}, async () => {
  assert.notEqual(process.env.TEST_DB_NAME, env.database.name, 'Usa una base distinta de la aplicación');
  const pool = mysql.createPool({
    host: env.database.host, port: env.database.port, user: env.database.user,
    password: env.database.password, database: process.env.TEST_DB_NAME
  });
  const createdIds = [];
  try {
    const migration = await fs.readFile(new URL('../database/migrations/002_profiles.sql', import.meta.url), 'utf8');
    for (let run = 0; run < 2; run += 1) {
      for (const statement of migration.split(';').filter((sql) => sql.trim())) await pool.query(statement);
    }
    const repository = new ProfileRepository(pool);
    const useCases = createProfileUseCases(repository);
    const permissions = await repository.findAllPermissions();
    const permissionId = permissions[0].id;
    for (const permissionIds of [[], [permissionId, permissionId]]) {
      const profile = await useCases.create({ name: 'Perfil de prueba', description: 'Descripción persistida', permissionIds }, 7);
      createdIds.push(profile.id);
      const [rows] = await pool.execute('SELECT name, description, created_by FROM profiles WHERE id = ?', [profile.id]);
      assert.deepEqual(rows[0], { name: 'Perfil de prueba', description: 'Descripción persistida', created_by: 7 });
      const [links] = await pool.execute('SELECT permission_id FROM profile_permissions WHERE profile_id = ?', [profile.id]);
      assert.deepEqual(links.map((link) => link.permission_id), [...new Set(permissionIds)]);
      assert.deepEqual(profile.permissionIds, [...new Set(permissionIds)]);
    }
    const [before] = await pool.query('SELECT COUNT(*) AS total FROM profiles');
    const missingId = Math.max(...permissions.map((permission) => permission.id)) + 1;
    await assert.rejects(() => useCases.create({ name: 'Inválido', permissionIds: [permissionId, missingId] }), {
      code: 'INVALID_PERMISSIONS', statusCode: 400
    });
    const [after] = await pool.query('SELECT COUNT(*) AS total FROM profiles');
    assert.equal(after[0].total, before[0].total);
  } finally {
    try {
      for (const id of createdIds) {
        await pool.execute('DELETE FROM profile_permissions WHERE profile_id = ?', [id]);
        await pool.execute('DELETE FROM profiles WHERE id = ?', [id]);
      }
    } finally {
      await pool.end();
    }
  }
});
