import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetUseCases } from '../src/modules/assets/application/assetUseCases.js';

function createRepositories() {
  const buildings = [{ id: 1, name: 'Torre Central' }];
  const assets = [];
  const history = [];
  const providers = [];

  return {
    buildingRepository: {
      async findById(id) {
        return buildings.find((building) => String(building.id) === String(id)) ?? null;
      }
    },
    providerRepository: {
      providers,
      async create(provider) {
        const created = { id: providers.length + 1, ...provider };
        providers.push(created);
        return created;
      },
      async findById(id) {
        return providers.find((provider) => String(provider.id) === String(id)) ?? null;
      },
      async findByName(name) {
        return providers.find((provider) => provider.name === name) ?? null;
      },
      async findAll() {
        return [...providers];
      }
    },
    assetRepository: {
      assets,
      history,
      async create(asset, historyEntries = []) {
        const created = { id: assets.length + 1, ...asset };
        assets.push(created);
        history.push(...historyEntries.map((entry) => ({ ...entry, assetId: created.id })));
        return created;
      },
      async update(id, changes, historyEntries = []) {
        const index = assets.findIndex((asset) => String(asset.id) === String(id));
        assets[index] = { ...assets[index], ...changes };
        history.push(...historyEntries.map((entry) => ({ ...entry, assetId: Number(id) })));
        return assets[index];
      },
      async updateStatus(id, status, updatedBy, historyEntries = []) {
        const index = assets.findIndex((asset) => String(asset.id) === String(id));
        assets[index] = { ...assets[index], status, updatedBy };
        history.push(...historyEntries.map((entry) => ({ ...entry, assetId: Number(id) })));
        return assets[index];
      },
      async findById(id) {
        return assets.find((asset) => String(asset.id) === String(id)) ?? null;
      },
      async findAllByBuilding(buildingId) {
        return assets.filter((asset) => String(asset.buildingId) === String(buildingId));
      },
      async findByBuildingAndCode(buildingId, code, excludedId = null) {
        return (
          assets.find(
            (asset) =>
              String(asset.buildingId) === String(buildingId) &&
              asset.code === code &&
              String(asset.id) !== String(excludedId)
          ) ?? null
        );
      },
      async findHistoryByAsset(assetId) {
        return history.filter((entry) => String(entry.assetId) === String(assetId));
      },
      async assignProvider(id, providerId, updatedBy, historyEntries = []) {
        const index = assets.findIndex((asset) => String(asset.id) === String(id));
        assets[index] = { ...assets[index], providerId, updatedBy };
        history.push(...historyEntries.map((entry) => ({ ...entry, assetId: Number(id) })));
        return assets[index];
      }
    }
  };
}

const validAsset = {
  code: 'ACT-001',
  name: 'Ascensor Torre A',
  description: 'Ascensor principal',
  type: 'electromecanico',
  status: 'activo',
  location: 'Torre A',
  acquisitionDate: '2024-01-15'
};

test('registra un activo asociado obligatoriamente a un edificio', async () => {
  const { assetRepository, buildingRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository);

  const asset = await useCases.create(1, validAsset, 3);

  assert.equal(asset.code, 'ACT-001');
  assert.equal(asset.buildingId, 1);
  assert.equal(asset.createdBy, 3);
  assert.equal(assetRepository.history[0].changeType, 'creacion');
});

test('consulta únicamente los activos del edificio seleccionado', async () => {
  const { assetRepository, buildingRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository);
  await useCases.create(1, validAsset);
  assetRepository.assets.push({
    id: 99,
    buildingId: 2,
    code: 'ACT-999',
    name: 'Otro',
    type: 'electrico',
    status: 'activo'
  });

  const assets = await useCases.listByBuilding(1);

  assert.equal(assets.length, 1);
  assert.equal(assets[0].code, 'ACT-001');
});

test('actualiza campos autorizados y registra los valores modificados', async () => {
  const { assetRepository, buildingRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository);
  const created = await useCases.create(1, validAsset);

  const updated = await useCases.update(
    created.id,
    {
      name: 'Ascensor modernizado',
      description: 'Cambio de cabina',
      type: 'electromecanico',
      location: 'Torre A · Sótano',
      acquisitionDate: '2024-01-15'
    },
    11
  );

  assert.equal(updated.name, 'Ascensor modernizado');
  assert.equal(updated.updatedBy, 11);
  const nameChange = assetRepository.history.find((entry) => entry.field === 'name');
  assert.equal(nameChange.oldValue, 'Ascensor Torre A');
  assert.equal(nameChange.newValue, 'Ascensor modernizado');
  assert.equal(nameChange.createdBy, 11);
});

test('cambia el estado del activo y conserva motivo y fecha', async () => {
  const { assetRepository, buildingRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository);
  const created = await useCases.create(1, validAsset);

  const updated = await useCases.changeStatus(
    created.id,
    { status: 'en_mantenimiento', reason: 'Falla en el tablero' },
    5
  );

  assert.equal(updated.status, 'en_mantenimiento');
  const statusChange = assetRepository.history.find(
    (entry) => entry.changeType === 'cambio_estado'
  );
  assert.equal(statusChange.oldValue, 'activo');
  assert.equal(statusChange.newValue, 'en_mantenimiento');
  assert.equal(statusChange.reason, 'Falla en el tablero');
  assert.equal(statusChange.createdBy, 5);
});

test('registra un proveedor nuevo y lo asocia al activo', async () => {
  const { assetRepository, buildingRepository, providerRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository, providerRepository);
  const created = await useCases.create(1, validAsset);

  const updated = await useCases.assignProvider(
    created.id,
    { name: 'Ascensores Andes', contactName: 'Ana Pérez', phone: '3001234567' },
    8
  );

  assert.equal(updated.provider.name, 'Ascensores Andes');
  assert.equal(updated.providerId, updated.provider.id);
  assert.equal(providerRepository.providers.length, 1);
});

test('asocia un proveedor existente al activo', async () => {
  const { assetRepository, buildingRepository, providerRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository, providerRepository);
  const created = await useCases.create(1, validAsset);
  const provider = await useCases.createProvider({
    name: 'Hidráulica Sur',
    email: 'contacto@sur.com'
  });

  const updated = await useCases.assignProvider(created.id, { providerId: provider.id });

  assert.equal(updated.providerId, provider.id);
  assert.equal(updated.provider.name, 'Hidráulica Sur');
});

test('consulta el historial del activo en orden cronológico', async () => {
  const { assetRepository, buildingRepository } = createRepositories();
  const useCases = createAssetUseCases(assetRepository, buildingRepository);
  const created = await useCases.create(1, validAsset);
  await useCases.changeStatus(created.id, {
    status: 'fuera_de_servicio',
    reason: 'Daño estructural'
  });

  const history = await useCases.getHistory(created.id);

  assert.equal(history[0].changeType, 'creacion');
  assert.equal(history[1].changeType, 'cambio_estado');
});
