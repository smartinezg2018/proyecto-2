import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildingUseCases } from '../src/modules/administration/application/buildingUseCases.js';

function createRepository() {
  const buildings = [];
  return {
    buildings,
    async create(building) {
      const created = { id: buildings.length + 1, ...building };
      buildings.push(created);
      return created;
    },
    async findAll() {
      return buildings;
    },
    async findById(id) {
      return buildings.find((building) => String(building.id) === String(id)) ?? null;
    },
    async findByIdentification(identification, excludedId = null) {
      return (
        buildings.find(
          (building) =>
            building.identification === identification && String(building.id) !== String(excludedId)
        ) ?? null
      );
    },
    async update(id, changes) {
      const index = buildings.findIndex((building) => String(building.id) === String(id));
      buildings[index] = { ...buildings[index], ...changes };
      return buildings[index];
    }
  };
}

test('registra un edificio y conserva el usuario creador', async () => {
  const repository = createRepository();
  const useCases = createBuildingUseCases(repository);

  const building = await useCases.create(
    {
      name: 'Torre Central',
      identification: 'NIT-123',
      address: 'Carrera 1 # 2-3',
      phone: '3001234567'
    },
    7
  );

  assert.equal(building.name, 'Torre Central');
  assert.equal(building.createdBy, 7);
});

test('rechaza edificios con identificación duplicada', async () => {
  const repository = createRepository();
  const useCases = createBuildingUseCases(repository);
  const input = { name: 'Torre Central', identification: 'NIT-123', address: 'Carrera 1' };

  await useCases.create(input);
  await assert.rejects(() => useCases.create(input), {
    code: 'DUPLICATE_BUILDING',
    statusCode: 409
  });
});

test('actualiza datos y conserva el usuario que modifica', async () => {
  const repository = createRepository();
  const useCases = createBuildingUseCases(repository);
  const created = await useCases.create({
    name: 'Torre Central',
    identification: 'NIT-123',
    address: 'Carrera 1'
  });

  const updated = await useCases.update(
    created.id,
    {
      name: 'Torre Central Actualizada',
      identification: 'NIT-123',
      address: 'Carrera 2'
    },
    9
  );

  assert.equal(updated.name, 'Torre Central Actualizada');
  assert.equal(updated.updatedBy, 9);
});
