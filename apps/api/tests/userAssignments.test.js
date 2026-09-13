import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserUseCases } from '../src/modules/administration/application/userUseCases.js';

function createRepository({ users = [{ id: 1 }], profiles = [10, 20], buildings = [100, 200] } = {}) {
  const state = {
    profileAssignments: new Map(),
    buildingAssignments: new Map()
  };
  return {
    state,
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async replaceProfiles(userId, profileIds) {
      if (!users.find((user) => user.id === userId)) {
        const error = new Error('missing');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      if (profileIds.some((id) => !profiles.includes(id))) {
        const error = new Error('invalid');
        error.code = 'INVALID_PROFILES';
        throw error;
      }
      state.profileAssignments.set(userId, [...profileIds]);
      return profileIds;
    },
    async findProfileIds(userId) {
      return state.profileAssignments.get(userId) ?? [];
    },
    async replaceBuildings(userId, buildingIds) {
      if (!users.find((user) => user.id === userId)) {
        const error = new Error('missing');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      if (buildingIds.some((id) => !buildings.includes(id))) {
        const error = new Error('invalid');
        error.code = 'INVALID_BUILDINGS';
        throw error;
      }
      state.buildingAssignments.set(userId, [...buildingIds]);
      return buildingIds;
    },
    async findBuildingIds(userId) {
      return state.buildingAssignments.get(userId) ?? [];
    }
  };
}

function createAudit() {
  const records = [];
  return {
    records,
    async record(entry) {
      records.push(entry);
    }
  };
}

test('assignProfiles guarda los identificadores y registra auditoría', async () => {
  const repository = createRepository();
  const audit = createAudit();
  const useCases = createUserUseCases(repository, audit);

  const result = await useCases.assignProfiles(1, { profileIds: [10, 20, 10] }, 7);

  assert.deepEqual(result, { userId: 1, profileIds: [10, 20] });
  assert.deepEqual(repository.state.profileAssignments.get(1), [10, 20]);
  assert.equal(audit.records.length, 1);
  assert.equal(audit.records[0].action, 'assign_profile');
  assert.equal(audit.records[0].entityId, 1);
});

test('assignBuildings rechaza edificios inexistentes', async () => {
  const repository = createRepository();
  const useCases = createUserUseCases(repository, null);

  await assert.rejects(() => useCases.assignBuildings(1, { buildingIds: [999] }, 7), {
    code: 'INVALID_BUILDINGS'
  });
});

test('assignProfiles valida el tipo de la lista', async () => {
  const useCases = createUserUseCases(createRepository(), null);
  for (const input of [undefined, {}, { profileIds: 'x' }, { profileIds: [0] }, { profileIds: [-1] }]) {
    await assert.rejects(() => useCases.assignProfiles(1, input, 7), {
      code: 'VALIDATION_ERROR'
    });
  }
});

test('listProfiles/listBuildings falla si el usuario no existe', async () => {
  const useCases = createUserUseCases(createRepository({ users: [] }), null);
  await assert.rejects(() => useCases.listProfiles(1), { code: 'USER_NOT_FOUND' });
  await assert.rejects(() => useCases.listBuildings(1), { code: 'USER_NOT_FOUND' });
});
