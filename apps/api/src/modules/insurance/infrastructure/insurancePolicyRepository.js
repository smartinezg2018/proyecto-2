import { database } from '../../../../database/connection.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class InsurancePolicyRepository {
  async findById(id) {
    const [rows] = await database.execute(
      `SELECT id, building_id AS buildingId, number, insurer,
              coverage, insured_value AS insuredValue,
              DATE_FORMAT(valid_from, '%Y-%m-%d') AS validFrom,
              DATE_FORMAT(valid_until, '%Y-%m-%d') AS validUntil
         FROM insurance_policies WHERE id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    return { ...rows[0], insuredValue: Number(rows[0].insuredValue) };
  }

  async findByBuilding(buildingId) {
    const [rows] = await database.execute(
      `SELECT id, building_id AS buildingId, number, insurer,
      coverage, insured_value AS insuredValue, DATE_FORMAT(valid_from, '%Y-%m-%d') AS validFrom,
      DATE_FORMAT(valid_until, '%Y-%m-%d') AS validUntil
      FROM insurance_policies WHERE building_id = ? ORDER BY valid_until, id`,
      [buildingId]
    );
    return rows.map((row) => ({ ...row, insuredValue: Number(row.insuredValue) }));
  }

  async create(buildingId, input, userId) {
    try {
      const [result] = await database.execute(
        `INSERT INTO insurance_policies
        (building_id, number, insurer, coverage, insured_value, valid_from, valid_until, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          buildingId,
          input.number,
          input.insurer,
          input.coverage,
          input.insuredValue,
          input.validFrom,
          input.validUntil,
          userId
        ]
      );
      return { id: result.insertId, buildingId: Number(buildingId), ...input };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY')
        throw new AppError(
          'La póliza ya existe para esta aseguradora y edificio.',
          409,
          'POLICY_EXISTS'
        );
      throw error;
    }
  }

  async getSettings(buildingId) {
    const [rows] = await database.execute(
      'SELECT alert_days AS alertDays FROM insurance_alert_settings WHERE building_id = ?',
      [buildingId]
    );
    return rows[0] ?? { alertDays: 30 };
  }

  async saveSettings(buildingId, alertDays, userId) {
    await database.execute(
      `INSERT INTO insurance_alert_settings (building_id, alert_days, updated_by)
      VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE alert_days = VALUES(alert_days), updated_by = VALUES(updated_by)`,
      [buildingId, alertDays, userId]
    );
    return { alertDays };
  }
}
