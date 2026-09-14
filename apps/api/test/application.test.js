import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildingUseCases } from '../src/modules/administration/application/buildingUseCases.js';
import { createPersonUseCases } from '../src/modules/administration/application/personUseCases.js';
import { createProfileUseCases } from '../src/modules/administration/application/profileUseCases.js';
import { createUnitUseCases } from '../src/modules/administration/application/unitUseCases.js';

async function rejectsWithCode(operation, code) {
  await assert.rejects(operation, (error) => error.code === code);
}

test('HU-001 registra un edificio válido', async () => {
  const repository = {
    findByNit: async () => null,
    create: async (building) => ({ id: 1, ...building })
  };
  const useCases = createBuildingUseCases(repository);

  const building = await useCases.create({
    name: 'Edificio Prueba',
    nit: '900123456',
    address: 'Calle 1'
  });

  assert.equal(building.id, 1);
  assert.equal(building.nit, '900123456');
});

test('HU-001 rechaza campos obligatorios vacíos', async () => {
  const useCases = createBuildingUseCases({});

  await rejectsWithCode(
    () => useCases.create({ name: '', nit: '900123456', address: 'Calle 1' }),
    'VALIDATION_ERROR'
  );
});

test('HU-001 rechaza un NIT duplicado', async () => {
  const repository = { findByNit: async () => ({ id: 1 }) };
  const useCases = createBuildingUseCases(repository);

  await rejectsWithCode(
    () =>
      useCases.create({
        name: 'Edificio Duplicado',
        nit: '900123456',
        address: 'Calle 2'
      }),
    'DUPLICATE_BUILDING'
  );
});

test('HU-004 crea un perfil con permisos sin duplicarlos', async () => {
  const repository = {
    create: async (profile) => ({ id: 1, ...profile })
  };
  const useCases = createProfileUseCases(repository);

  const profile = await useCases.create({
    name: 'Administrador',
    description: 'Perfil de prueba',
    permissionIds: [1, 1, 2]
  });

  assert.deepEqual(profile.permissionIds, [1, 2]);
});

test('HU-010 rechaza coeficientes fuera del rango permitido', async () => {
  const unitRepository = { findByBuildingNumberAndTower: async () => null };
  const buildingRepository = { findById: async () => ({ id: 1 }) };
  const useCases = createUnitUseCases(unitRepository, buildingRepository);

  await rejectsWithCode(
    () =>
      useCases.create(1, {
        number: '101',
        tower: 'A',
        coefficient: 100.01,
        status: 'desocupada'
      }),
    'VALIDATION_ERROR'
  );
});

test('HU-011 exige al menos un inmueble para el responsable', async () => {
  const useCases = createPersonUseCases({}, {});

  await rejectsWithCode(
    () =>
      useCases.registerResponsible({
        identification: '1001',
        name: 'Responsable',
        unitIds: []
      }),
    'VALIDATION_ERROR'
  );
});
