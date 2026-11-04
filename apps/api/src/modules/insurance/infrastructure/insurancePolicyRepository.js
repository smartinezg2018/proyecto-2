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

  async findByBuilding(buildingId, filters = {}) {
    const conditions = ['building_id = ?'];
    const parameters = [buildingId];
    if (filters.insurer) {
      conditions.push('LOWER(insurer) = LOWER(?)');
      parameters.push(filters.insurer);
    }
    if (filters.expiresFrom) {
      conditions.push('valid_until >= ?');
      parameters.push(filters.expiresFrom);
    }
    if (filters.expiresTo) {
      conditions.push('valid_until <= ?');
      parameters.push(filters.expiresTo);
    }
    const [rows] = await database.execute(
      `SELECT id, building_id AS buildingId, number, insurer,
      coverage, insured_value AS insuredValue, DATE_FORMAT(valid_from, '%Y-%m-%d') AS validFrom,
      DATE_FORMAT(valid_until, '%Y-%m-%d') AS validUntil
      FROM insurance_policies WHERE ${conditions.join(' AND ')} ORDER BY valid_until, id`,
      parameters
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

  async update(buildingId, policyId, input) {
    try {
      const [result] = await database.execute(
        `UPDATE insurance_policies
            SET number = ?, insurer = ?, coverage = ?, insured_value = ?,
                valid_from = ?, valid_until = ?
          WHERE id = ? AND building_id = ?`,
        [
          input.number,
          input.insurer,
          input.coverage,
          input.insuredValue,
          input.validFrom,
          input.validUntil,
          policyId,
          buildingId
        ]
      );
      if (result.affectedRows === 0) return null;
      return this.findById(policyId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError(
          'La pÃ³liza ya existe para esta aseguradora y edificio.',
          409,
          'POLICY_EXISTS'
        );
      }
      throw error;
    }
  }

  async replaceAssets(buildingId, policyId, assetIds, userId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [policies] = await connection.execute(
        'SELECT id FROM insurance_policies WHERE id = ? AND building_id = ? FOR UPDATE',
        [policyId, buildingId]
      );
      if (!policies[0]) {
        throw new AppError('La pÃ³liza no existe.', 404, 'POLICY_NOT_FOUND');
      }

      const placeholders = assetIds.map(() => '?').join(', ');
      const [assets] = await connection.execute(
        `SELECT id FROM assets WHERE building_id = ? AND id IN (${placeholders})`,
        [buildingId, ...assetIds]
      );
      if (assets.length !== assetIds.length) {
        throw new AppError(
          'Todos los activos deben pertenecer al edificio de la pÃ³liza.',
          400,
          'ASSET_BUILDING_MISMATCH'
        );
      }

      await connection.execute('DELETE FROM insurance_policy_assets WHERE policy_id = ?', [
        policyId
      ]);
      const values = assetIds.map(() => '(?, ?, ?)').join(', ');
      const parameters = assetIds.flatMap((assetId) => [policyId, assetId, userId]);
      await connection.execute(
        `INSERT INTO insurance_policy_assets (policy_id, asset_id, created_by) VALUES ${values}`,
        parameters
      );
      await connection.commit();
      return { policyId: Number(policyId), assetIds };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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
