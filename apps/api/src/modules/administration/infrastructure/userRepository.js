import { database } from '../../../infrastructure/database/connection.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class UserRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const [rows] = await this.pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
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
        `INSERT INTO users (identification, name, email, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.identification, user.name, user.email, user.status, user.createdBy, user.createdBy]
      );
    } catch (error) {
      // Los índices únicos también protegen ante registros simultáneos.
      if (error.code === 'ER_DUP_ENTRY') {
        const key = error.sqlMessage?.match(/for key '(?:[^']+\.)?(uq_users_email|uq_users_identification)'$/)?.[1];
        if (key === 'uq_users_email') {
          throw new AppError('Ya existe un usuario con ese correo.', 409, 'DUPLICATE_USER_EMAIL');
        }
        if (key === 'uq_users_identification') {
          throw new AppError('Ya existe un usuario con esa identificación.', 409, 'DUPLICATE_USER_IDENTIFICATION');
        }
      }
      throw error;
    }

    return this.findById(result.insertId);
  }
}
