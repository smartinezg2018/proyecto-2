import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnitUseCases } from '../src/modules/administration/application/unitUseCases.js';

function createRepositories() {
  const buildings = [{ id: 1, name: 'Torre Central' }];
  const units = [];

  return {
    buildingRepository: {
      async findById(id) {
        return buildings.find((building) => String(building.id) === String(id)) ?? null;
      }
    },
    unitRepository: {
      units,
      async create(unit) {
        const created = { id: units.length + 1, ...unit, responsible: null };
        units.push(created);
        return created;
      },
      async findById(id) {
        return units.find((unit) => String(unit.id) === String(id)) ?? null;
      },
      async findAllByBuilding(buildingId) {
        return units.filter((unit) => String(unit.buildingId) === String(buildingId));
      },
      async findByBuildingNumberAndTower(buildingId, number, tower, excludedId = null) {
        return (
          units.find(
            (unit) =>
              String(unit.buildingId) === String(buildingId) &&
              unit.number === number &&
              unit.tower === tower &&
              String(unit.id) !== String(excludedId)
          ) ?? null
        );
      }
    }
  };
}

test('registra un apartamento asociado a un edificio', async () => {
  const { unitRepository, buildingRepository } = createRepositories();
  const useCases = createUnitUseCases(unitRepository, buildingRepository);

  const unit = await useCases.create(
    1,
    {
      number: '101',
      tower: 'A',
      kind: 'apartamento',
      coefficient: 1.25,
      status: 'ocupada'
    },
    4
  );

  assert.equal(unit.number, '101');
  assert.equal(unit.tower, 'A');
  assert.equal(unit.kind, 'apartamento');
  assert.equal(unit.coefficient, 1.25);
  assert.equal(unit.createdBy, 4);
});

test('registra un parqueadero como inmueble', async () => {
  const { unitRepository, buildingRepository } = createRepositories();
  const useCases = createUnitUseCases(unitRepository, buildingRepository);

  const unit = await useCases.create(1, {
    number: 'PQ15',
    kind: 'parqueadero',
    coefficient: 0.48,
    status: 'ocupada'
  });

  assert.equal(unit.kind, 'parqueadero');
  assert.equal(unit.number, 'PQ15');
});

test('rechaza inmuebles duplicados dentro del mismo edificio', async () => {
  const { unitRepository, buildingRepository } = createRepositories();
  const useCases = createUnitUseCases(unitRepository, buildingRepository);
  const input = { number: '101', tower: 'A', kind: 'apartamento', coefficient: 1, status: 'ocupada' };

  await useCases.create(1, input);
  await assert.rejects(() => useCases.create(1, input), {
    code: 'DUPLICATE_UNIT',
    statusCode: 409
  });
});

test('rechaza un inmueble cuando el edificio no existe', async () => {
  const { unitRepository, buildingRepository } = createRepositories();
  const useCases = createUnitUseCases(unitRepository, buildingRepository);

  await assert.rejects(
    () =>
      useCases.create(99, {
        number: '101',
        kind: 'apartamento',
        coefficient: 1,
        status: 'ocupada'
      }),
    { code: 'BUILDING_NOT_FOUND', statusCode: 404 }
  );
});
