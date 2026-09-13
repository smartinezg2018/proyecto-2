import { database } from '../../../infrastructure/database/connection.js';

export class AuditRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async record(entry) {
    await this.pool.execute(
      `INSERT INTO audit_logs
         (user_id, action, module, entity, entity_id, building_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId ?? null,
        entry.action,
        entry.module,
        entry.entity,
        entry.entityId ?? null,
        entry.buildingId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    );
  }

  async find(filters) {
    const conditions = [];
    const parameters = [];

    if (filters.userId != null) {
      conditions.push('al.user_id = ?');
      parameters.push(filters.userId);
    }
    if (filters.module) {
      conditions.push('al.module = ?');
      parameters.push(filters.module);
    }
    if (filters.entity) {
      conditions.push('al.entity = ?');
      parameters.push(filters.entity);
    }
    if (filters.buildingId != null) {
      conditions.push('al.building_id = ?');
      parameters.push(filters.buildingId);
    }
    if (filters.from) {
      conditions.push('al.created_at >= ?');
      parameters.push(filters.from);
    }
    if (filters.to) {
      conditions.push('al.created_at <= ?');
      parameters.push(filters.to);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows] = await this.pool.execute(
      `SELECT al.id,
              al.user_id AS userId,
              u.name AS userName,
              u.email AS userEmail,
              al.action,
              al.module,
              al.entity,
              al.entity_id AS entityId,
              al.building_id AS buildingId,
              b.name AS buildingName,
              al.metadata,
              al.created_at AS createdAt
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         LEFT JOIN buildings b ON b.id = al.building_id
         ${whereClause}
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT ${filters.pageSize} OFFSET ${offset}`,
      parameters
    );

    const [countRows] = await this.pool.execute(
      `SELECT COUNT(*) AS total
         FROM audit_logs al
         ${whereClause}`,
      parameters
    );

    return {
      items: rows.map((row) => ({
        ...row,
        metadata: row.metadata ? safeParseJson(row.metadata) : null
      })),
      total: Number(countRows[0].total)
    };
  }
}

function safeParseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
