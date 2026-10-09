import { sequelize } from '../../../../database/connection.js';
import { Asset, AssetHistory, Maintenance } from '../../../../database/models/index.js';

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

function mapMaintenance(maintenance) {
  if (!maintenance) {
    return null;
  }

  const data = maintenance.get({ plain: true });

  return {
    id: data.id,
    assetId: data.assetId,
    buildingId: data.buildingId,
    maintenanceType: data.maintenanceType,
    maintenanceDate: formatDate(data.maintenanceDate),
    description: data.description,
    failure: data.failureDescription ?? null,
    cause: data.cause ?? null,
    actionsTaken: data.actionsTaken ?? null,
    asset: data.asset ? { id: data.asset.id, code: data.asset.code, name: data.asset.name } : null,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

const assetInclude = { model: Asset, as: 'asset', attributes: ['id', 'code', 'name'] };

const chronologicalOrder = [
  ['maintenanceDate', 'DESC'],
  ['id', 'DESC']
];

export class MaintenanceRepository {
  async create(maintenance, historyEntry) {
    const createdId = await sequelize.transaction(async (transaction) => {
      const created = await Maintenance.create(
        {
          assetId: maintenance.assetId,
          buildingId: maintenance.buildingId,
          maintenanceType: maintenance.maintenanceType,
          maintenanceDate: maintenance.maintenanceDate,
          description: maintenance.description,
          failureDescription: maintenance.failureDescription ?? null,
          cause: maintenance.cause ?? null,
          actionsTaken: maintenance.actionsTaken ?? null,
          createdBy: maintenance.createdBy,
          updatedBy: maintenance.createdBy
        },
        { transaction }
      );

      await AssetHistory.create(
        {
          assetId: maintenance.assetId,
          changeType: historyEntry.changeType,
          field: historyEntry.field,
          oldValue: historyEntry.oldValue,
          newValue: historyEntry.newValue,
          reason: historyEntry.reason,
          createdBy: historyEntry.createdBy
        },
        { transaction }
      );

      return created.id;
    });

    return this.findById(createdId);
  }

  async findById(id) {
    const maintenance = await Maintenance.findByPk(id, { include: [assetInclude] });
    return mapMaintenance(maintenance);
  }

  async findByAsset(assetId) {
    const maintenances = await Maintenance.findAll({
      where: { assetId: Number(assetId) },
      include: [assetInclude],
      order: chronologicalOrder
    });

    return maintenances.map(mapMaintenance);
  }

  async findByBuilding(buildingId) {
    const maintenances = await Maintenance.findAll({
      where: { buildingId: Number(buildingId) },
      include: [assetInclude],
      order: chronologicalOrder
    });

    return maintenances.map(mapMaintenance);
  }
}
