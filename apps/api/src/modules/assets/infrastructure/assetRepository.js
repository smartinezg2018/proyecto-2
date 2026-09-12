import { Op } from 'sequelize';
import { sequelize } from '../../../../database/connection.js';
import { Asset, AssetHistory } from '../../../../database/models/index.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapAsset(asset) {
  if (!asset) {
    return null;
  }

  const data = asset.get({ plain: true });

  return {
    id: data.id,
    buildingId: data.buildingId,
    code: data.code,
    name: data.name,
    description: data.description,
    type: data.type,
    status: data.status,
    location: data.location,
    acquisitionDate: formatDate(data.acquisitionDate),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

function mapHistory(entry) {
  const data = entry.get({ plain: true });

  return {
    id: data.id,
    assetId: data.assetId,
    changeType: data.changeType,
    field: data.field,
    oldValue: data.oldValue,
    newValue: data.newValue,
    reason: data.reason,
    createdBy: data.createdBy,
    createdAt: data.createdAt
  };
}

async function insertHistory(assetId, historyEntries, transaction) {
  if (historyEntries.length === 0) {
    return;
  }

  await AssetHistory.bulkCreate(
    historyEntries.map((entry) => ({
      assetId,
      changeType: entry.changeType,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason,
      createdBy: entry.createdBy
    })),
    { transaction }
  );
}

export class AssetRepository {
  async create(asset, historyEntries = []) {
    const createdId = await sequelize.transaction(async (transaction) => {
      const created = await Asset.create(
        {
          buildingId: asset.buildingId,
          code: asset.code,
          name: asset.name,
          description: asset.description,
          type: asset.type,
          status: asset.status,
          location: asset.location,
          acquisitionDate: asset.acquisitionDate,
          createdBy: asset.createdBy,
          updatedBy: asset.createdBy
        },
        { transaction }
      );

      await insertHistory(created.id, historyEntries, transaction);
      return created.id;
    });

    return this.findById(createdId);
  }

  async update(id, asset, historyEntries = []) {
    await sequelize.transaction(async (transaction) => {
      await Asset.update(
        {
          name: asset.name,
          description: asset.description,
          type: asset.type,
          location: asset.location,
          acquisitionDate: asset.acquisitionDate,
          updatedBy: asset.updatedBy
        },
        { where: { id }, transaction }
      );

      await insertHistory(id, historyEntries, transaction);
    });

    return this.findById(id);
  }

  async updateStatus(id, status, updatedBy, historyEntries = []) {
    await sequelize.transaction(async (transaction) => {
      await Asset.update({ status, updatedBy }, { where: { id }, transaction });
      await insertHistory(id, historyEntries, transaction);
    });

    return this.findById(id);
  }

  async findById(id) {
    const asset = await Asset.findByPk(id);
    return mapAsset(asset);
  }

  async findAllByBuilding(buildingId) {
    const assets = await Asset.findAll({
      where: { buildingId },
      order: [['code', 'ASC']]
    });

    return assets.map(mapAsset);
  }

  async search({ q, buildingId, type, status } = {}) {
    const where = {};

    if (buildingId) {
      where.buildingId = buildingId;
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (q) {
      const term = `%${q}%`;
      where[Op.or] = [{ code: { [Op.like]: term } }, { name: { [Op.like]: term } }];
    }

    const assets = await Asset.findAll({
      where,
      order: [['code', 'ASC']]
    });

    return assets.map(mapAsset);
  }

  async findByBuildingAndCode(buildingId, code, excludedId = null) {
    const where = { buildingId, code };
    if (excludedId !== null && excludedId !== undefined) {
      where.id = { [Op.ne]: excludedId };
    }

    return Asset.findOne({ where, attributes: ['id'] });
  }

  async findHistoryByAsset(assetId) {
    const history = await AssetHistory.findAll({
      where: { assetId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return history.map(mapHistory);
  }
}
