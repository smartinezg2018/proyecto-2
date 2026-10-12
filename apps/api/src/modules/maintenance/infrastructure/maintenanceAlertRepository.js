import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database/connection.js';

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

function mapAlert(row) {
  return {
    id: row.id,
    buildingId: row.buildingId,
    maintenanceId: row.maintenanceId,
    targetDate: formatDate(row.targetDate),
    status: row.status,
    createdAt: formatDateTime(row.createdAt),
    attendedAt: formatDateTime(row.attendedAt),
    attendedBy: row.attendedBy ?? null,
    asset: row.assetCode
      ? { id: row.assetId, code: row.assetCode, name: row.assetName }
      : null,
    responsible: row.responsible ?? null,
    frequency: row.frequency ?? null,
    maintenanceType: row.maintenanceType ?? null,
    failure: row.failure ?? null
  };
}

export class MaintenanceAlertRepository {
  async getSettings(buildingId) {
    const rows = await sequelize.query(
      `SELECT alert_days AS alertDays
         FROM maintenance_alert_settings
        WHERE building_id = :buildingId`,
      { replacements: { buildingId: Number(buildingId) }, type: QueryTypes.SELECT }
    );

    return rows[0] ?? { alertDays: 7 };
  }

  async saveSettings(buildingId, alertDays, userId) {
    await sequelize.query(
      `INSERT INTO maintenance_alert_settings (building_id, alert_days, updated_by)
       VALUES (:buildingId, :alertDays, :userId)
       ON DUPLICATE KEY UPDATE alert_days = VALUES(alert_days), updated_by = VALUES(updated_by)`,
      {
        replacements: {
          buildingId: Number(buildingId),
          alertDays,
          userId
        }
      }
    );

    return { alertDays };
  }

  async ensureAlert({ buildingId, maintenanceId, targetDate }) {
    await sequelize.query(
      `INSERT IGNORE INTO maintenance_alerts (building_id, maintenance_id, target_date, status)
       VALUES (:buildingId, :maintenanceId, :targetDate, 'pendiente')`,
      {
        replacements: {
          buildingId: Number(buildingId),
          maintenanceId: Number(maintenanceId),
          targetDate
        }
      }
    );
  }

  async findByBuilding(buildingId) {
    const rows = await sequelize.query(
      `SELECT a.id,
              a.building_id AS buildingId,
              a.maintenance_id AS maintenanceId,
              a.target_date AS targetDate,
              a.status,
              a.created_at AS createdAt,
              a.attended_at AS attendedAt,
              a.attended_by AS attendedBy,
              m.responsible,
              m.frequency,
              m.maintenance_type AS maintenanceType,
              m.failure_description AS failure,
              ast.id AS assetId,
              ast.code AS assetCode,
              ast.name AS assetName
         FROM maintenance_alerts a
         JOIN maintenances m ON m.id = a.maintenance_id
         LEFT JOIN assets ast ON ast.id = m.asset_id
        WHERE a.building_id = :buildingId
        ORDER BY a.status ASC, a.target_date ASC, a.id ASC`,
      {
        replacements: { buildingId: Number(buildingId) },
        type: QueryTypes.SELECT
      }
    );

    return rows.map(mapAlert);
  }

  async findById(id) {
    const rows = await sequelize.query(
      `SELECT a.id,
              a.building_id AS buildingId,
              a.maintenance_id AS maintenanceId,
              a.target_date AS targetDate,
              a.status,
              a.created_at AS createdAt,
              a.attended_at AS attendedAt,
              a.attended_by AS attendedBy,
              m.responsible,
              m.frequency,
              m.maintenance_type AS maintenanceType,
              m.failure_description AS failure,
              ast.id AS assetId,
              ast.code AS assetCode,
              ast.name AS assetName
         FROM maintenance_alerts a
         JOIN maintenances m ON m.id = a.maintenance_id
         LEFT JOIN assets ast ON ast.id = m.asset_id
        WHERE a.id = :id
        LIMIT 1`,
      {
        replacements: { id: Number(id) },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] ? mapAlert(rows[0]) : null;
  }

  async markAttended(id, userId) {
    await sequelize.query(
      `UPDATE maintenance_alerts
          SET status = 'atendida',
              attended_at = NOW(),
              attended_by = :userId
        WHERE id = :id AND status = 'pendiente'`,
      { replacements: { userId, id: Number(id) } }
    );

    return this.findById(id);
  }
}
