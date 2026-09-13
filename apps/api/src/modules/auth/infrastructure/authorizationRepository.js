import { database } from '../../../infrastructure/database/connection.js';

export class AuthorizationRepository {
  constructor(pool = database) {
    this.pool = pool;
  }

  async findEffectivePermissions(userId) {
    const [rows] = await this.pool.execute(
      `SELECT DISTINCT p.code
         FROM user_profiles up
         JOIN profile_permissions pp ON pp.profile_id = up.profile_id
         JOIN permissions p ON p.id = pp.permission_id
        WHERE up.user_id = ?`,
      [userId]
    );
    return rows.map((row) => row.code);
  }

  async hasBuildingAccess(userId, buildingId) {
    const [rows] = await this.pool.execute(
      'SELECT 1 FROM user_buildings WHERE user_id = ? AND building_id = ? LIMIT 1',
      [userId, buildingId]
    );
    return rows.length > 0;
  }

  async findAssignedBuildings(userId) {
    const [rows] = await this.pool.execute(
      `SELECT b.id, b.name, b.nit, b.address
         FROM user_buildings ub
         JOIN buildings b ON b.id = ub.building_id
        WHERE ub.user_id = ?
        ORDER BY b.name ASC`,
      [userId]
    );
    return rows;
  }

  async findAllBuildings() {
    const [rows] = await this.pool.execute(
      `SELECT id, name, nit, address
         FROM buildings
        ORDER BY name ASC`
    );
    return rows;
  }
}
