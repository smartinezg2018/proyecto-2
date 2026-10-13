import { database } from '../../../../database/connection.js';
import { AppError } from '../../../shared/errors/AppError.js';

function splitCoverages(coverage) {
  return String(coverage ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapPolicy(row) {
  return {
    ...row,
    insuredValue: Number(row.insuredValue),
    coverages: splitCoverages(row.coverage),
    assets: []
  };
}

async function insertAssets(connection, policyId, assetIds, userId) {
  for (const assetId of assetIds) {
    await connection.execute(
      'INSERT INTO policy_assets (policy_id, asset_id, created_by) VALUES (?, ?, ?)',
      [policyId, assetId, userId]
    );
  }
}

export class InsurancePolicyRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async attachRelations(policies, pool = this.pool) {
    const listed = policies.map((policy) => ({
      ...policy,
      coverages: policy.coverages ?? splitCoverages(policy.coverage),
      assets: policy.assets ?? []
    }));
    if (listed.length === 0) return listed;

    const placeholders = listed.map(() => '?').join(', ');
    const [rows] = await pool.execute(
      `SELECT pa.policy_id AS policyId, a.id, a.code, a.name
         FROM policy_assets pa
         JOIN assets a ON a.id = pa.asset_id
        WHERE pa.policy_id IN (${placeholders})
        ORDER BY a.code, a.id`,
      listed.map((policy) => policy.id)
    );
    const byId = new Map(listed.map((policy) => [Number(policy.id), policy]));
    for (const row of rows) {
      byId.get(Number(row.policyId))?.assets.push({
        id: row.id,
        code: row.code,
        name: row.name
      });
    }
    return listed;
  }

  async findDetailed(id) {
    const policy = await this.findById(id);
    if (!policy) return null;
    const [detailed] = await this.attachRelations([policy]);
    return detailed;
  }

  async findByAsset(buildingId, assetId) {
    const [rows] = await this.pool.execute(
      `SELECT p.id, p.building_id AS buildingId, p.number, p.insurer,
              p.coverage, p.insured_value AS insuredValue,
              DATE_FORMAT(p.valid_from, '%Y-%m-%d') AS validFrom,
              DATE_FORMAT(p.valid_until, '%Y-%m-%d') AS validUntil
         FROM insurance_policies p
         JOIN policy_assets pa ON pa.policy_id = p.id
        WHERE p.building_id = ? AND pa.asset_id = ?
        ORDER BY p.valid_until, p.id`,
      [buildingId, assetId]
    );
    return this.attachRelations(rows.map(mapPolicy));
  }

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
    return mapPolicy(rows[0]);
  }

  async findByBuilding(buildingId) {
    const [rows] = await database.execute(
      `SELECT id, building_id AS buildingId, number, insurer,
      coverage, insured_value AS insuredValue, DATE_FORMAT(valid_from, '%Y-%m-%d') AS validFrom,
      DATE_FORMAT(valid_until, '%Y-%m-%d') AS validUntil
      FROM insurance_policies WHERE building_id = ? ORDER BY valid_until, id`,
      [buildingId]
    );
    return this.attachRelations(rows.map(mapPolicy));
  }

  async create(buildingId, input, userId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
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
      await insertAssets(connection, result.insertId, input.assetIds ?? [], userId);
      await connection.commit();
      return this.findDetailed(result.insertId);
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY')
        throw new AppError(
          'La póliza ya existe para esta aseguradora y edificio.',
          409,
          'POLICY_EXISTS'
        );
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id, input, userId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE insurance_policies
            SET number = ?, insurer = ?, coverage = ?, insured_value = ?,
                valid_from = ?, valid_until = ?
          WHERE id = ?`,
        [
          input.number,
          input.insurer,
          input.coverage,
          input.insuredValue,
          input.validFrom,
          input.validUntil,
          id
        ]
      );
      await connection.execute('DELETE FROM policy_assets WHERE policy_id = ?', [id]);
      await insertAssets(connection, id, input.assetIds ?? [], userId);
      await connection.commit();
      return this.findDetailed(id);
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY')
        throw new AppError(
          'La póliza ya existe para esta aseguradora y edificio.',
          409,
          'POLICY_EXISTS'
        );
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
