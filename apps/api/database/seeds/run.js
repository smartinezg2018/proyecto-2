import { database, sequelize } from '../connection.js';
import { hashPassword } from '../../src/modules/auth/infrastructure/password.js';
import { REAL_BUILDINGS } from './realBuildings.js';

const SEED_BUILDINGS = [...REAL_BUILDINGS];

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
      'units.delete',
      'persons.list',
      'persons.create',
      'assets.list',
      'assets.create',
      'assets.update',
      'users.list',
      'profiles.list',
      'maintenance.view',
      'maintenance.update',
      'insurance.view',
      'insurance.update',
      'billing.view',
      'billing.payment.create',
      'billing.payment.apply',
      'billing.receipt.view',
      'budget.view',
      'budget.update',
      'projects.view',
      'projects.create',
      'projects.update'
    ]
  },
  {
    name: 'Auditor',
    description: 'Consulta auditoría y listados administrativos.',
    permissionCodes: [
      'audit.read',
      'users.list',
      'profiles.list',
      'buildings.list',
      'buildings.read'
    ]
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
    buildingNits: REAL_BUILDINGS.map((item) => item.nit)
  },
  {
    identification: '1000000002',
    name: 'Carlos Ruiz',
    email: 'edificio@example.com',
    password: 'Edificio123!',
    status: 'active',
    profileName: 'Administrador de edificio',
    buildingNits: ['900170804-8', '900501288-9']
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
    buildingNits: ['900170804-8']
  },
  {
    identification: '1000000005',
    name: 'Usuario Inactivo',
    email: 'inactivo@example.com',
    password: 'Inactivo123!',
    status: 'inactive',
    profileName: 'Operador',
    buildingNits: ['900170804-8']
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

function recurringExecutions(amount, description) {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    day: 15,
    amount,
    extraordinary: false,
    description
  }));
}

function previousYearExpenseLines(scale) {
  const money = (value) => Math.round(value * scale);
  const maintenance = [1800000, 1800000, 2000000, 1800000, 1800000, 2200000, 1800000, 1800000, 1900000, 1800000, 1800000, 2500000];
  return [
    {
      code: 'ASE',
      name: 'Aseo y cafetería',
      budgeted: money(30000000),
      executions: recurringExecutions(money(2500000), 'seed:aseo-mensual')
    },
    {
      code: 'VIG',
      name: 'Vigilancia',
      budgeted: money(60000000),
      executions: recurringExecutions(money(4800000), 'seed:vigilancia-mensual')
    },
    {
      code: 'SRV',
      name: 'Servicios públicos',
      budgeted: money(15600000),
      executions: recurringExecutions(money(1200000), 'seed:servicios-mensual')
    },
    {
      code: 'MNT',
      name: 'Mantenimiento locativo',
      budgeted: money(24000000),
      executions: maintenance.map((amount, index) => ({
        month: index + 1,
        day: 15,
        amount: money(amount),
        extraordinary: false,
        description: 'seed:mantenimiento-mensual'
      }))
    },
    {
      code: 'ADM',
      name: 'Administración',
      budgeted: money(12000000),
      executions: recurringExecutions(money(900000), 'seed:administracion-mensual')
    },
    {
      code: 'FAC',
      name: 'Reparación de fachada',
      budgeted: money(18500000),
      executions: [
        {
          month: 3,
          day: 20,
          amount: money(18500000),
          extraordinary: true,
          description: 'seed:fachada-extraordinaria'
        }
      ]
    },
    {
      code: 'BOM',
      name: 'Reposición de bombas',
      budgeted: money(6400000),
      executions: [
        {
          month: 8,
          day: 10,
          amount: money(6400000),
          extraordinary: true,
          description: 'seed:bombas-extraordinaria'
        }
      ]
    }
  ];
}

async function seedPreviousYearBudget(connection, { buildingId, year, createdBy, lines }) {
  const [budgets] = await connection.execute(
    'SELECT id FROM annual_budgets WHERE building_id = ? AND year = ?',
    [buildingId, year]
  );
  if (budgets.length) {
    const [foreignRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM budget_executions be
       INNER JOIN budget_lines bl ON bl.id = be.budget_line_id
       INNER JOIN annual_budgets ab ON ab.id = bl.budget_id
       WHERE ab.building_id = ? AND ab.year = ?
         AND (be.description IS NULL OR be.description NOT LIKE 'seed:%')`,
      [buildingId, year]
    );
    if (Number(foreignRows[0].total) > 0) {
      console.log(`Budget ${year} kept for building ${buildingId}: tiene ejecuciones propias.`);
      return;
    }
    await connection.execute('DELETE FROM annual_budgets WHERE building_id = ? AND year = ?', [
      buildingId,
      year
    ]);
  }

  const [budgetResult] = await connection.execute(
    `INSERT INTO annual_budgets (building_id, year, version, status, created_by)
     VALUES (?, ?, 1, 'cerrado', ?)`,
    [buildingId, year, createdBy]
  );
  for (const line of lines) {
    const [lineResult] = await connection.execute(
      `INSERT INTO budget_lines (budget_id, code, name, classification, amount)
       VALUES (?, ?, ?, 'gasto', ?)`,
      [budgetResult.insertId, line.code, line.name, line.budgeted]
    );
    for (const execution of line.executions) {
      const month = String(execution.month).padStart(2, '0');
      const day = String(execution.day || 15).padStart(2, '0');
      await connection.execute(
        `INSERT INTO budget_executions
           (budget_line_id, execution_date, amount, description, is_extraordinary, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          lineResult.insertId,
          `${year}-${month}-${day}`,
          execution.amount,
          execution.description,
          execution.extraordinary ? 1 : 0,
          createdBy
        ]
      );
    }
  }
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

  const previousYear = new Date().getFullYear() - 1;
  const budgetSeeds = [
    { nit: '900170804-8', scale: 1 },
    { nit: '900501288-9', scale: 0.8 },
    { nit: '900020096-7', scale: 1 }
  ];
  for (const item of budgetSeeds) {
    const buildingId = buildingIdsByNit.get(item.nit);
    await seedPreviousYearBudget(connection, {
      buildingId,
      year: previousYear,
      createdBy: adminUserId,
      lines: previousYearExpenseLines(item.scale)
    });
    console.log(`Previous-year budget ready: ${item.nit} ${previousYear}`);
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
