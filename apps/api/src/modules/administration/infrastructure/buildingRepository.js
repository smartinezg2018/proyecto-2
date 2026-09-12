import { database } from '../../../infrastructure/database/connection.js';

export class BuildingRepository {
  async create(building) {
    const [result] = await database.execute(
      `INSERT INTO buildings
        (name, identification, address, phone, email, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        building.name,
        building.identification,
        building.address,
        building.phone,
        building.email,
        building.createdBy,
        building.createdBy
      ]
    );

    return this.findById(result.insertId);
  }

  async findAll() {
    const [rows] = await database.execute(
      `SELECT id, name, identification, address, phone, email,
              created_by AS createdBy, updated_by AS updatedBy,
              created_at AS createdAt, updated_at AS updatedAt
       FROM buildings
       ORDER BY name ASC`
    );

    return rows;
  }

  async findById(id) {
    const [rows] = await database.execute(
      `SELECT id, name, identification, address, phone, email,
              created_by AS createdBy, updated_by AS updatedBy,
              created_at AS createdAt, updated_at AS updatedAt
       FROM buildings
       WHERE id = ?`,
      [id]
    );

    return rows[0] ?? null;
  }

  async findByIdentification(identification, excludedId = null) {
    const [rows] = await database.execute(
      `SELECT id
       FROM buildings
       WHERE identification = ? AND (? IS NULL OR id <> ?)
       LIMIT 1`,
      [identification, excludedId, excludedId]
    );

    return rows[0] ?? null;
  }

  async update(id, building) {
    await database.execute(
      `UPDATE buildings
       SET name = ?, identification = ?, address = ?, phone = ?,
           email = ?, updated_by = ?
       WHERE id = ?`,
      [
        building.name,
        building.identification,
        building.address,
        building.phone,
        building.email,
        building.updatedBy,
        id
      ]
    );

    return this.findById(id);
  }
}
