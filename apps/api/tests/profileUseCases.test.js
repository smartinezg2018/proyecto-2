import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileUseCases } from '../src/modules/administration/application/profileUseCases.js';

function createRepository() {
  const profiles = [];
  return {
    profiles,
    async create(profile) {
      const created = { id: profiles.length + 1, ...profile };
      profiles.push(created);
      return created;
    }
  };
}

test('crea un perfil con nombre y descripción, sin permisos', async () => {
  const repository = createRepository();
  const profile = await createProfileUseCases(repository).create({
    name: ' Administrador ', description: 'Administra el edificio'
  }, 7);
  assert.equal(profile.name, 'Administrador');
  assert.equal(profile.description, 'Administra el edificio');
  assert.equal(profile.createdBy, 7);
  assert.deepEqual(profile.permissionIds, []);
  assert.deepEqual(repository.profiles, [profile]);
});

test('asocia funcionalidades sin duplicarlas', async () => {
  const profile = await createProfileUseCases(createRepository()).create({
    name: 'Administrador', permissionIds: [1, 2, 1]
  });
  assert.deepEqual(profile.permissionIds, [1, 2]);
  assert.equal(profile.description, null);
});

test('rechaza nombres ausentes, vacíos o demasiado largos', async () => {
  const repository = createRepository();
  const useCases = createProfileUseCases(repository);
  for (const input of [undefined, null, {}, { name: '' }, { name: '  ' }, { name: 1 }, { name: 'a'.repeat(151) }]) {
    await assert.rejects(() => useCases.create(input), { code: 'VALIDATION_ERROR', statusCode: 400 });
  }
  assert.equal(repository.profiles.length, 0);
});

test('rechaza descripciones e identificadores inválidos antes de guardar', async () => {
  const repository = createRepository();
  const useCases = createProfileUseCases(repository);
  for (const changes of [
    { description: 1 }, { description: 'á'.repeat(32768) },
    ...[null, '1', [0], [-1], [1.5], ['1'], [Number.MAX_SAFE_INTEGER + 1]].map((permissionIds) => ({ permissionIds }))
  ]) {
    await assert.rejects(() => useCases.create({ name: 'Perfil', ...changes }), {
      code: 'VALIDATION_ERROR', statusCode: 400
    });
  }
  assert.equal(repository.profiles.length, 0);
});
