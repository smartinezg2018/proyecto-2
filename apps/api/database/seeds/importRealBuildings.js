import { database, sequelize } from '../connection.js';
import { REAL_BUILDINGS } from './realBuildings.js';

async function upsertBuilding(connection, building) {
  const [existing] = await connection.execute('SELECT id FROM buildings WHERE nit = ? LIMIT 1', [
    building.nit
  ]);

  if (existing.length) {
    await connection.execute(
      `UPDATE buildings
          SET name = ?, address = ?, phone = ?, email = ?
        WHERE id = ?`,
      [building.name, building.address, building.phone, building.email, existing[0].id]
    );
    return { id: existing[0].id, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO buildings (name, nit, address, phone, email)
     VALUES (?, ?, ?, ?, ?)`,
    [building.name, building.nit, building.address, building.phone, building.email]
  );
  return { id: result.insertId, created: true };
}

async function assignBuildingToUser(connection, userId, buildingId) {
  const [existing] = await connection.execute(
    'SELECT 1 FROM user_buildings WHERE user_id = ? AND building_id = ? LIMIT 1',
    [userId, buildingId]
  );
  if (existing.length) return false;

  await connection.execute('INSERT INTO user_buildings (user_id, building_id) VALUES (?, ?)', [
    userId,
    buildingId
  ]);
  return true;
}

let connection;
try {
  connection = await database.getConnection();
  await connection.beginTransaction();

  const [admins] = await connection.execute(
    "SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1"
  );
  const adminUserId = admins[0]?.id ?? null;

  let createdCount = 0;
  let updatedCount = 0;
  let assignedCount = 0;

  for (const building of REAL_BUILDINGS) {
    const { id, created } = await upsertBuilding(connection, building);
    if (created) createdCount += 1;
    else updatedCount += 1;

    if (adminUserId && (await assignBuildingToUser(connection, adminUserId, id))) {
      assignedCount += 1;
    }

    if (created && adminUserId) {
      await connection.execute(
        `INSERT INTO audit_logs
           (user_id, action, module, entity, entity_id, building_id, metadata)
         VALUES (?, 'create', 'administration', 'building', ?, ?, ?)`,
        [
          adminUserId,
          id,
          id,
          JSON.stringify({
            name: building.name,
            nit: building.nit,
            source: 'excel-carga-masiva'
          })
        ]
      );
    }

    console.log(`${created ? 'Created' : 'Updated'}: ${building.name} (${building.nit})`);
  }

  await connection.commit();
  console.log(
    `Carga masiva lista. Creados: ${createdCount}. Actualizados: ${updatedCount}. Asignados al admin: ${assignedCount}.`
  );
} catch (error) {
  if (connection) await connection.rollback();
  console.error('Import failed:', error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
