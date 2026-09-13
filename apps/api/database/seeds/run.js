import { database, sequelize } from '../connection.js';
import { hashPassword } from '../../src/modules/auth/infrastructure/password.js';

const SEED_BUILDINGS = [
  {
    nit: '900111001',
    name: 'Conjunto El Nogal',
    address: 'Calle 10 # 20-30, Bogotá',
    phone: '6015550101',
    email: 'nogal@example.com'
  },
  {
    nit: '900111002',
    name: 'Torre Central',
    address: 'Av. 68 # 45-12, Bogotá',
    phone: '6015550102',
    email: 'central@example.com'
  },
  {
    nit: '900111003',
    name: 'Residencia Los Robles',
    address: 'Carrera 7 # 80-15, Bogotá',
    phone: '6015550103',
    email: 'robles@example.com'
  }
];

const SEED_PROFILES = [
  {
    name: 'Administrador general',
    description: 'Acceso total al sistema.',
    permissionCodes: ['admin.all']
  },
  {
    name: 'Administrador de edificio',
    description: 'Gestiona edificios asignados, inmuebles, activos y consulta usuarios.',
    permissionCodes: [
      'buildings.list',
      'buildings.read',
      'buildings.create',
      'buildings.update',
      'units.list',
      'units.create',
      'persons.list',
      'persons.create',
      'assets.list',
      'assets.create',
      'assets.update',
      'users.list',
      'profiles.list',
      'maintenance.view',
      'insurance.view',
      'billing.view',
      'budget.view',
      'projects.view'
    ]
  },
  {
    name: 'Auditor',
    description: 'Consulta auditoría y listados administrativos.',
    permissionCodes: ['audit.read', 'users.list', 'profiles.list', 'buildings.list', 'buildings.read']
  },
  {
    name: 'Operador',
    description: 'Consulta edificios, inmuebles y activos asignados.',
    permissionCodes: [
      'buildings.list',
      'buildings.read',
      'units.list',
      'assets.list',
      'maintenance.view'
    ]
  }
];

const SEED_USERS = [
  {
    identification: '1000000001',
    name: 'Ana Martínez',
    email: 'admin@example.com',
    password: 'Admin123!',
    status: 'active',
    profileName: 'Administrador general',
    buildingNits: ['900111001', '900111002', '900111003']
  },
  {
    identification: '1000000002',
    name: 'Carlos Ruiz',
    email: 'edificio@example.com',
    password: 'Edificio123!',
    status: 'active',
    profileName: 'Administrador de edificio',
    buildingNits: ['900111001', '900111002']
  },
  {
    identification: '1000000003',
    name: 'Laura Gómez',
    email: 'auditor@example.com',
    password: 'Auditor123!',
    status: 'active',
    profileName: 'Auditor',
    buildingNits: []
  },
  {
    identification: '1000000004',
    name: 'Pedro Sánchez',
    email: 'operador@example.com',
    password: 'Operador123!',
    status: 'active',
    profileName: 'Operador',
    buildingNits: ['900111001']
  },
  {
    identification: '1000000005',
    name: 'Usuario Inactivo',
    email: 'inactivo@example.com',
    password: 'Inactivo123!',
    status: 'inactive',
    profileName: 'Operador',
    buildingNits: ['900111001']
  }
];

async function findPermissionIds(connection, codes) {
  if (!codes.length) return [];
  const placeholders = codes.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT id, code FROM permissions WHERE code IN (${placeholders})`,
    codes
  );
  if (rows.length !== codes.length) {
    const found = new Set(rows.map((row) => row.code));
    const missing = codes.filter((code) => !found.has(code));
    throw new Error(`Permisos no encontrados: ${missing.join(', ')}`);
  }
  return rows.map((row) => row.id);
}

async function upsertBuilding(connection, building) {
  const [existing] = await connection.execute('SELECT id FROM buildings WHERE nit = ? LIMIT 1', [
    building.nit
  ]);
  if (existing.length) return { id: existing[0].id, created: false };

  const [result] = await connection.execute(
    `INSERT INTO buildings (name, nit, address, phone, email)
     VALUES (?, ?, ?, ?, ?)`,
    [building.name, building.nit, building.address, building.phone, building.email]
  );
  return { id: result.insertId, created: true };
}

async function upsertProfile(connection, profile) {
  const [existing] = await connection.execute('SELECT id FROM profiles WHERE name = ? LIMIT 1', [
    profile.name
  ]);
  let profileId = existing[0]?.id;
  if (!profileId) {
    const [result] = await connection.execute(
      'INSERT INTO profiles (name, description) VALUES (?, ?)',
      [profile.name, profile.description]
    );
    profileId = result.insertId;
  }

  const permissionIds = await findPermissionIds(connection, profile.permissionCodes);
  await connection.execute('DELETE FROM profile_permissions WHERE profile_id = ?', [profileId]);
  for (const permissionId of permissionIds) {
    await connection.execute(
      'INSERT INTO profile_permissions (profile_id, permission_id) VALUES (?, ?)',
      [profileId, permissionId]
    );
  }
  return profileId;
}

async function upsertUser(connection, user, profileId, buildingIdsByNit) {
  const passwordHash = await hashPassword(user.password);
  const [existing] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
    user.email
  ]);
  let userId = existing[0]?.id;
  if (!userId) {
    const [result] = await connection.execute(
      `INSERT INTO users (identification, name, email, status, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [user.identification, user.name, user.email, user.status, passwordHash]
    );
    userId = result.insertId;
  } else {
    await connection.execute(
      `UPDATE users
          SET identification = ?, name = ?, status = ?, password_hash = ?
        WHERE id = ?`,
      [user.identification, user.name, user.status, passwordHash, userId]
    );
  }

  await connection.execute('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
  await connection.execute('INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)', [
    userId,
    profileId
  ]);

  await connection.execute('DELETE FROM user_buildings WHERE user_id = ?', [userId]);
  for (const nit of user.buildingNits) {
    const buildingId = buildingIdsByNit.get(nit);
    if (!buildingId) {
      throw new Error(`Edificio no encontrado para NIT ${nit}`);
    }
    await connection.execute('INSERT INTO user_buildings (user_id, building_id) VALUES (?, ?)', [
      userId,
      buildingId
    ]);
  }

  return userId;
}

let connection;
try {
  connection = await database.getConnection();
  await connection.beginTransaction();

  const buildingIdsByNit = new Map();
  const createdBuildings = [];
  for (const building of SEED_BUILDINGS) {
    const { id, created } = await upsertBuilding(connection, building);
    buildingIdsByNit.set(building.nit, id);
    if (created) createdBuildings.push({ id, ...building });
    console.log(`Building ready: ${building.name} (${building.nit})`);
  }

  const profileIdsByName = new Map();
  for (const profile of SEED_PROFILES) {
    const id = await upsertProfile(connection, profile);
    profileIdsByName.set(profile.name, id);
    console.log(`Profile ready: ${profile.name}`);
  }

  let adminUserId = null;
  for (const user of SEED_USERS) {
    const profileId = profileIdsByName.get(user.profileName);
    if (!profileId) {
      throw new Error(`Perfil no encontrado: ${user.profileName}`);
    }
    const userId = await upsertUser(connection, user, profileId, buildingIdsByNit);
    if (user.email === 'admin@example.com') adminUserId = userId;
    console.log(`User ready: ${user.email}`);
  }

  for (const building of createdBuildings) {
    await connection.execute(
      `INSERT INTO audit_logs
         (user_id, action, module, entity, entity_id, building_id, metadata)
       VALUES (?, 'create', 'administration', 'building', ?, ?, ?)`,
      [
        adminUserId,
        building.id,
        building.id,
        JSON.stringify({
          name: building.name,
          nit: building.nit,
          source: 'seed'
        })
      ]
    );
    console.log(`Audit ready: building ${building.name}`);
  }

  // Ensure seed buildings have at least one audit row even if they already existed.
  for (const building of SEED_BUILDINGS) {
    const buildingId = buildingIdsByNit.get(building.nit);
    const [existingAudit] = await connection.execute(
      `SELECT id FROM audit_logs
        WHERE entity = 'building' AND entity_id = ? AND action = 'create'
        LIMIT 1`,
      [buildingId]
    );
    if (existingAudit.length) continue;
    await connection.execute(
      `INSERT INTO audit_logs
         (user_id, action, module, entity, entity_id, building_id, metadata)
       VALUES (?, 'create', 'administration', 'building', ?, ?, ?)`,
      [
        adminUserId,
        buildingId,
        buildingId,
        JSON.stringify({
          name: building.name,
          nit: building.nit,
          source: 'seed-backfill'
        })
      ]
    );
    console.log(`Audit backfilled: building ${building.name}`);
  }

  await connection.commit();
  console.log('Database seeds completed.');
} catch (error) {
  if (connection) await connection.rollback();
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
