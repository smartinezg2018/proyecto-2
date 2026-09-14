import { database } from '../../../infrastructure/database/connection.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class UserRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const [rows] = await this.pool.execute(
      'SELECT id, identification, name, email, status, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] ?? null;
  }

  async findByIdentification(identification) {
    const [rows] = await this.pool.execute(
      'SELECT id FROM users WHERE identification = ? LIMIT 1',
      [identification]
    );
    return rows[0] ?? null;
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      `SELECT id, identification, name, email, status,
              created_by AS createdBy, updated_by AS updatedBy,
              created_at AS createdAt, updated_at AS updatedAt
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(user) {
    let result;
    try {
      [result] = await this.pool.execute(
        `INSERT INTO users (identification, name, email, status, password_hash, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.identification,
          user.name,
          user.email,
          user.status,
          user.passwordHash ?? null,
          user.createdBy,
          user.createdBy
        ]
      );
    } catch (error) {
      // Los índices únicos también protegen ante registros simultáneos.
      if (error.code === 'ER_DUP_ENTRY') {
        const key = error.sqlMessage?.match(
          /for key '(?:[^']+\.)?(uq_users_email|uq_users_identification)'$/
        )?.[1];
        if (key === 'uq_users_email') {
          throw new AppError('Ya existe un usuario con ese correo.', 409, 'DUPLICATE_USER_EMAIL');
        }
        if (key === 'uq_users_identification') {
          throw new AppError(
            'Ya existe un usuario con esa identificación.',
            409,
            'DUPLICATE_USER_IDENTIFICATION'
          );
        }
      }
      throw error;
    }

    return this.findById(result.insertId);
  }

  async findAll() {
    const [rows] = await this.pool.execute(
      `SELECT id, identification, name, email, status,
              created_at AS createdAt, updated_at AS updatedAt
       FROM users
       ORDER BY name ASC`
    );
    return rows;
  }

  async replaceProfiles(userId, profileIds, actorId = null) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [userRows] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [
        userId
      ]);
      if (!userRows.length) {
        throw new AppError('El usuario no existe.', 404, 'USER_NOT_FOUND');
      }

      if (profileIds.length) {
        const placeholders = profileIds.map(() => '?').join(', ');
        const [profileRows] = await connection.execute(
          `SELECT id FROM profiles WHERE id IN (${placeholders}) FOR SHARE`,
          profileIds
        );
        if (profileRows.length !== profileIds.length) {
          throw new AppError('Uno o más perfiles no existen.', 400, 'INVALID_PROFILES');
        }
      }

      await connection.execute('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
      for (const profileId of profileIds) {
        await connection.execute(
          'INSERT INTO user_profiles (user_id, profile_id, created_by) VALUES (?, ?, ?)',
          [userId, profileId, actorId]
        );
      }
      await connection.commit();
      return profileIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findProfileIds(userId) {
    const [rows] = await this.pool.execute(
      'SELECT profile_id AS profileId FROM user_profiles WHERE user_id = ? ORDER BY profile_id ASC',
      [userId]
    );
    return rows.map((row) => row.profileId);
  }

  async replaceBuildings(userId, buildingIds, actorId = null) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [userRows] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [
        userId
      ]);
      if (!userRows.length) {
        throw new AppError('El usuario no existe.', 404, 'USER_NOT_FOUND');
      }

      if (buildingIds.length) {
        const placeholders = buildingIds.map(() => '?').join(', ');
        const [buildingRows] = await connection.execute(
          `SELECT id FROM buildings WHERE id IN (${placeholders}) FOR SHARE`,
          buildingIds
        );
        if (buildingRows.length !== buildingIds.length) {
          throw new AppError('Uno o más edificios no existen.', 400, 'INVALID_BUILDINGS');
        }
      }

      await connection.execute('DELETE FROM user_buildings WHERE user_id = ?', [userId]);
      for (const buildingId of buildingIds) {
        await connection.execute(
          'INSERT INTO user_buildings (user_id, building_id, created_by) VALUES (?, ?, ?)',
          [userId, buildingId, actorId]
        );
      }
      await connection.commit();
      return buildingIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findBuildingIds(userId) {
    const [rows] = await this.pool.execute(
      'SELECT building_id AS buildingId FROM user_buildings WHERE user_id = ? ORDER BY building_id ASC',
      [userId]
    );
    return rows.map((row) => row.buildingId);
  }
}
