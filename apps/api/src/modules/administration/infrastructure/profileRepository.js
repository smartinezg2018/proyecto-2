import { database } from '../../../infrastructure/database/connection.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class ProfileRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async findAllPermissions() {
    const [rows] = await this.pool.execute('SELECT id, code, name FROM permissions ORDER BY id ASC');
    return rows;
  }

  async create(profile) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      if (profile.permissionIds.length) {
        const placeholders = profile.permissionIds.map(() => '?').join(', ');
        const [permissions] = await connection.execute(
          `SELECT id FROM permissions WHERE id IN (${placeholders}) FOR SHARE`,
          profile.permissionIds
        );
        if (permissions.length !== profile.permissionIds.length) {
          throw new AppError('Una o más funcionalidades no existen.', 400, 'INVALID_PERMISSIONS');
        }
      }

      const [result] = await connection.execute(
        'INSERT INTO profiles (name, description, created_by, updated_by) VALUES (?, ?, ?, ?)',
        [profile.name, profile.description, profile.createdBy, profile.createdBy]
      );
      for (const permissionId of profile.permissionIds) {
        await connection.execute(
          'INSERT INTO profile_permissions (profile_id, permission_id) VALUES (?, ?)',
          [result.insertId, permissionId]
        );
      }
      const [rows] = await connection.execute(
        `SELECT id, name, description, created_by AS createdBy, updated_by AS updatedBy,
                created_at AS createdAt, updated_at AS updatedAt FROM profiles WHERE id = ?`,
        [result.insertId]
      );
      await connection.commit();
      return { ...rows[0], permissionIds: profile.permissionIds };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
