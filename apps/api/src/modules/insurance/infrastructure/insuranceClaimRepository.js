import { database } from '../../../../database/connection.js';

function mapClaim(row) {
  return {
    ...row,
    claimedAmount: Number(row.claimedAmount),
    indemnityAmount: row.indemnityAmount == null ? null : Number(row.indemnityAmount),
    documentRefs:
      typeof row.documentRefs === 'string' ? JSON.parse(row.documentRefs) : row.documentRefs,
    assets: [],
    documents: []
  };
}

async function attachAssets(pool, claims) {
  if (claims.length === 0) return claims;
  const placeholders = claims.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT ca.claim_id AS claimId, a.id, a.code, a.name
       FROM insurance_claim_assets ca
       JOIN assets a ON a.id = ca.asset_id
      WHERE ca.claim_id IN (${placeholders})
      ORDER BY a.code`,
    claims.map((claim) => claim.id)
  );
  const claimsById = new Map(claims.map((claim) => [Number(claim.id), claim]));
  for (const row of rows) claimsById.get(Number(row.claimId))?.assets.push(row);
  const [documents] = await pool.execute(
    `SELECT id, claim_id AS claimId, original_name AS originalName,
            mime_type AS mimeType, size_bytes AS sizeBytes
       FROM insurance_claim_documents WHERE claim_id IN (${placeholders})`,
    claims.map((claim) => claim.id)
  );
  for (const document of documents)
    claimsById.get(Number(document.claimId))?.documents.push(document);
  return claims;
}

export class InsuranceClaimRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async findDocument(buildingId, claimId, documentId) {
    const [rows] = await this.pool.execute(
      `SELECT d.id, d.original_name AS originalName, d.mime_type AS mimeType
       FROM insurance_claim_documents d JOIN insurance_claims c ON c.id = d.claim_id
       WHERE c.building_id = ? AND c.id = ? AND d.id = ?`,
      [buildingId, claimId, documentId]
    );
    return rows[0] ?? null;
  }

  async findByBuilding(buildingId, filters = {}, pool = this.pool) {
    const conditions = ['c.building_id = ?'];
    const parameters = [buildingId];
    if (filters.policyId) {
      conditions.push('c.policy_id = ?');
      parameters.push(filters.policyId);
    }
    if (filters.assetId) {
      conditions.push(
        'EXISTS (SELECT 1 FROM insurance_claim_assets filter_ca WHERE filter_ca.claim_id = c.id AND filter_ca.asset_id = ?)'
      );
      parameters.push(filters.assetId);
    }
    const [rows] = await pool.execute(
      `SELECT c.id, c.building_id AS buildingId, c.policy_id AS policyId,
              p.number AS policyNumber, p.insurer,
              DATE_FORMAT(c.claim_date, '%Y-%m-%d') AS claimDate,
              c.description, c.status, c.result,
              c.claimed_amount AS claimedAmount,
              c.indemnity_amount AS indemnityAmount,
              DATE_FORMAT(c.resolved_at, '%Y-%m-%d') AS resolvedAt,
              c.document_refs AS documentRefs, c.created_by AS createdBy,
              c.created_at AS createdAt
         FROM insurance_claims c
         JOIN insurance_policies p ON p.id = c.policy_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY c.claim_date DESC, c.id DESC`,
      parameters
    );
    return attachAssets(pool, rows.map(mapClaim));
  }

  async create(input) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO insurance_claims
          (building_id, policy_id, claim_date, description, status, result, claimed_amount,
           indemnity_amount, resolved_at, document_refs, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.buildingId,
          input.policyId,
          input.claimDate,
          input.description,
          input.status,
          input.result,
          input.claimedAmount,
          input.indemnityAmount,
          input.resolvedAt,
          JSON.stringify(input.documentRefs),
          input.createdBy,
          input.createdBy
        ]
      );
      for (const assetId of input.assetIds) {
        await connection.execute(
          'INSERT INTO insurance_claim_assets (claim_id, asset_id) VALUES (?, ?)',
          [result.insertId, assetId]
        );
      }
      for (const document of input.documents ?? []) {
        await connection.execute(
          'INSERT INTO insurance_claim_documents (id, claim_id, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
          [
            document.id,
            result.insertId,
            document.originalName,
            document.mimeType,
            document.sizeBytes
          ]
        );
      }
      const claims = await this.findByBuilding(input.buildingId, {}, connection);
      await connection.commit();
      return claims.find((claim) => Number(claim.id) === Number(result.insertId));
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
