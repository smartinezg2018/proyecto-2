import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database/connection.js';
import {
  Asset,
  AssetHistory,
  Maintenance,
  MaintenanceStatusHistory
} from '../../../../database/models/index.js';

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

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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
    status: data.status,
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
  async create(maintenance, historyEntry, statusChange) {
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
          status: maintenance.status,
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

      await MaintenanceStatusHistory.create(
        {
          maintenanceId: created.id,
          fromStatus: statusChange?.fromStatus ?? null,
          toStatus: statusChange?.toStatus ?? maintenance.status,
          changedBy: statusChange?.changedBy ?? maintenance.createdBy,
          changedAt: statusChange?.changedAt ?? new Date()
        },
        { transaction }
      );

      return created.id;
    });

    return this.findById(createdId);
  }

  async updateStatus(id, status, updatedBy, statusChange) {
    await sequelize.transaction(async (transaction) => {
      await Maintenance.update({ status, updatedBy }, { where: { id }, transaction });
      await MaintenanceStatusHistory.create(
        {
          maintenanceId: id,
          fromStatus: statusChange.fromStatus,
          toStatus: statusChange.toStatus,
          changedBy: statusChange.changedBy,
          changedAt: statusChange.changedAt
        },
        { transaction }
      );
    });

    return this.findById(id);
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

  async findStatusHistory(maintenanceId) {
    const rows = await sequelize.query(
      `SELECT h.id,
              h.maintenance_id AS maintenanceId,
              h.from_status AS fromStatus,
              h.to_status AS toStatus,
              h.changed_by AS changedBy,
              u.name AS changedByName,
              h.changed_at AS changedAt
         FROM maintenance_status_history h
         LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.maintenance_id = :maintenanceId
        ORDER BY h.changed_at ASC, h.id ASC`,
      {
        replacements: { maintenanceId: Number(maintenanceId) },
        type: QueryTypes.SELECT
      }
    );

    return rows.map((row) => ({
      id: row.id,
      maintenanceId: row.maintenanceId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      changedBy: row.changedBy,
      changedByName: row.changedByName ?? null,
      changedAt: formatDateTime(row.changedAt)
    }));
  }
}
