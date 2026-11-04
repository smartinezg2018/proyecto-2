import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfileUseCases } from '../src/modules/administration/application/profileUseCases.js';
import { ProfileRepository } from '../src/modules/administration/infrastructure/profileRepository.js';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

test('MySQL: persiste perfiles y asociaciones y rechaza permisos inexistentes', async () => {
  const h = await createIntegrationHarness('profiles');
  try {
    const repository = new ProfileRepository(h.database);
    const useCases = createProfileUseCases(repository);
    const permissions = await repository.findAllPermissions();
    const permissionId = permissions[0].id;
    for (const [index, permissionIds] of [[], [permissionId, permissionId]].entries()) {
      const profile = await useCases.create(
        { name: `Perfil de prueba ${index}`, description: 'Descripción persistida', permissionIds },
        7
      );
      const [rows] = await h.database.execute(
        'SELECT name, description, created_by FROM profiles WHERE id = ?',
        [profile.id]
      );
      assert.equal(rows[0].description, 'Descripción persistida');
      assert.equal(rows[0].created_by, 7);
      const [links] = await h.database.execute(
        'SELECT permission_id FROM profile_permissions WHERE profile_id = ?',
        [profile.id]
      );
      assert.deepEqual(
        links.map((link) => link.permission_id),
        [...new Set(permissionIds)]
      );
    }
    const [before] = await h.database.query('SELECT COUNT(*) AS total FROM profiles');
    const missingId = Math.max(...permissions.map((permission) => permission.id)) + 1;
    await assert.rejects(
      () => useCases.create({ name: 'Inválido', permissionIds: [permissionId, missingId] }),
      { code: 'INVALID_PERMISSIONS', statusCode: 400 }
    );
    const [after] = await h.database.query('SELECT COUNT(*) AS total FROM profiles');
    assert.equal(after[0].total, before[0].total);
  } finally {
    await h.close();
  }
});
