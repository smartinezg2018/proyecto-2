// Datos DEMO de presupuesto para el edificio Bonaire (solo para pruebas).
// Es idempotente: si ya existe un presupuesto para el año, lo omite.
// Uso: npm run db:seed-budget-demo --prefix apps/api
import { database, sequelize } from '../connection.js';

const BONAIRE_NIT = '900020096-7';

// [código, nombre, clasificación, monto anual]
const LINES = {
  2024: [
    ['ING-01', 'Cuotas de administración ordinarias', 'ingreso', 312000000],
    ['ING-02', 'Cuotas extraordinarias', 'ingreso', 24000000],
    ['ING-03', 'Alquiler salón comunal', 'ingreso', 9600000],
    ['ING-04', 'Intereses de mora', 'ingreso', 6000000],
    ['GAS-01', 'Vigilancia y seguridad', 'gasto', 96000000],
    ['GAS-02', 'Aseo y limpieza', 'gasto', 54000000],
    ['GAS-03', 'Servicios públicos zonas comunes', 'gasto', 42000000],
    ['GAS-04', 'Mantenimiento de ascensores', 'gasto', 28800000],
    ['GAS-05', 'Póliza de seguros', 'gasto', 18000000],
    ['GAS-06', 'Jardinería y zonas verdes', 'gasto', 12000000],
    ['GAS-07', 'Reparaciones locativas', 'gasto', 30000000],
    ['GAS-08', 'Imprevistos', 'gasto', 10000000]
  ],
  2025: [
    ['ING-01', 'Cuotas de administración ordinarias', 'ingreso', 336000000],
    ['ING-02', 'Cuotas extraordinarias', 'ingreso', 30000000],
    ['ING-03', 'Alquiler salón comunal', 'ingreso', 10800000],
    ['ING-04', 'Intereses de mora', 'ingreso', 6600000],
    ['GAS-01', 'Vigilancia y seguridad', 'gasto', 104000000],
    ['GAS-02', 'Aseo y limpieza', 'gasto', 58000000],
    ['GAS-03', 'Servicios públicos zonas comunes', 'gasto', 45000000],
    ['GAS-04', 'Mantenimiento de ascensores', 'gasto', 31000000],
    ['GAS-05', 'Póliza de seguros', 'gasto', 19500000],
    ['GAS-06', 'Jardinería y zonas verdes', 'gasto', 13000000],
    ['GAS-07', 'Reparaciones locativas', 'gasto', 36000000],
    ['GAS-08', 'Imprevistos', 'gasto', 12000000]
  ],
  2026: [
    ['ING-01', 'Cuotas de administración ordinarias', 'ingreso', 360000000],
    ['ING-02', 'Cuotas extraordinarias', 'ingreso', 36000000],
    ['ING-03', 'Alquiler salón comunal', 'ingreso', 12000000],
    ['ING-04', 'Intereses de mora', 'ingreso', 7200000],
    ['GAS-01', 'Vigilancia y seguridad', 'gasto', 112000000],
    ['GAS-02', 'Aseo y limpieza', 'gasto', 62000000],
    ['GAS-03', 'Servicios públicos zonas comunes', 'gasto', 48000000],
    ['GAS-04', 'Mantenimiento de ascensores', 'gasto', 33000000],
    ['GAS-05', 'Póliza de seguros', 'gasto', 21000000],
    ['GAS-06', 'Jardinería y zonas verdes', 'gasto', 14000000],
    ['GAS-07', 'Reparaciones locativas', 'gasto', 40000000],
    ['GAS-08', 'Imprevistos', 'gasto', 15000000]
  ]
};

const STATUS_BY_YEAR = { 2024: 'cerrado', 2025: 'aprobado', 2026: 'aprobado' };

// Meses con ejecución por año (2026 va hasta octubre).
const MONTHS_BY_YEAR = { 2024: 12, 2025: 12, 2026: 10 };

// Ratio ejecutado/presupuestado por partida. >1 = sobreejecución, <0.5 = baja ejecución.
const RATIOS = {
  2024: {
    'ING-01': 0.98, 'ING-02': 1.0, 'ING-03': 0.85, 'ING-04': 1.2,
    'GAS-01': 1.0, 'GAS-02': 0.97, 'GAS-03': 1.08, 'GAS-04': 0.95,
    'GAS-05': 1.0, 'GAS-06': 0.9, 'GAS-07': 1.15, 'GAS-08': 0.4
  },
  2025: {
    'ING-01': 1.01, 'ING-02': 0.9, 'ING-03': 0.7, 'ING-04': 1.35,
    'GAS-01': 1.02, 'GAS-02': 0.99, 'GAS-03': 1.12, 'GAS-04': 0.92,
    'GAS-05': 1.0, 'GAS-06': 0.88, 'GAS-07': 1.3, 'GAS-08': 0.3
  },
  2026: {
    'ING-01': 0.82, 'ING-02': 0.35, 'ING-03': 0.75, 'ING-04': 0.9,
    'GAS-01': 0.86, 'GAS-02': 0.8, 'GAS-03': 0.95, 'GAS-04': 0.78,
    'GAS-05': 1.0, 'GAS-06': 0.4, 'GAS-07': 1.1, 'GAS-08': 0.2
  }
};

const DESCRIPTIONS = {
  'ING-01': 'Recaudo cuotas de administración',
  'ING-02': 'Recaudo cuota extraordinaria',
  'ING-03': 'Alquiler salón comunal',
  'ING-04': 'Intereses de mora recaudados',
  'GAS-01': 'Pago servicio de vigilancia',
  'GAS-02': 'Pago servicio de aseo',
  'GAS-03': 'Facturas de energía y acueducto',
  'GAS-04': 'Mantenimiento mensual de ascensores',
  'GAS-05': 'Cuota póliza de seguros',
  'GAS-06': 'Servicio de jardinería',
  'GAS-07': 'Reparación locativa',
  'GAS-08': 'Gasto imprevisto'
};

function pad(n) {
  return String(n).padStart(2, '0');
}

// Reparte `total` en `parts` cuotas con una variación pequeña y determinista.
function splitAmount(total, parts, seed) {
  const base = Math.floor(total / parts);
  const amounts = [];
  let assigned = 0;
  for (let i = 0; i < parts - 1; i += 1) {
    const wiggle = ((seed + i * 7) % 11) - 5; // -5..5
    const value = Math.max(1, Math.round(base * (1 + wiggle / 100)));
    amounts.push(value);
    assigned += value;
  }
  amounts.push(Math.max(1, total - assigned));
  return amounts;
}

let connection;
try {
  connection = await database.getConnection();
  await connection.beginTransaction();

  const [buildings] = await connection.execute('SELECT id FROM buildings WHERE nit = ? LIMIT 1', [
    BONAIRE_NIT
  ]);
  if (!buildings.length) {
    throw new Error('No existe el edificio Bonaire. Ejecute primero npm run db:seed.');
  }
  const buildingId = buildings[0].id;

  const [admins] = await connection.execute(
    "SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1"
  );
  const createdBy = admins[0]?.id ?? null;

  for (const year of Object.keys(LINES).map(Number)) {
    const [existing] = await connection.execute(
      'SELECT id FROM annual_budgets WHERE building_id = ? AND year = ? LIMIT 1',
      [buildingId, year]
    );
    if (existing.length) {
      console.log(`Presupuesto ${year} ya existe, se omite.`);
      continue;
    }

    const [budgetResult] = await connection.execute(
      `INSERT INTO annual_budgets (building_id, year, version, status, created_by, updated_by)
       VALUES (?, ?, 1, ?, ?, ?)`,
      [buildingId, year, STATUS_BY_YEAR[year], createdBy, createdBy]
    );
    const budgetId = budgetResult.insertId;

    let executionCount = 0;
    for (const [lineIndex, [code, name, classification, amount]] of LINES[year].entries()) {
      const [lineResult] = await connection.execute(
        `INSERT INTO budget_lines (budget_id, code, name, classification, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [budgetId, code, name, classification, amount]
      );
      const lineId = lineResult.insertId;

      const months = MONTHS_BY_YEAR[year];
      const target = Math.round(amount * RATIOS[year][code]);
      if (target <= 0) continue;
      const parts = splitAmount(target, months, year + lineIndex);
      for (let m = 0; m < months; m += 1) {
        const day = 5 + ((lineIndex * 3 + m) % 20);
        await connection.execute(
          `INSERT INTO budget_executions
             (budget_line_id, execution_date, amount, description, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            lineId,
            `${year}-${pad(m + 1)}-${pad(day)}`,
            parts[m],
            `${DESCRIPTIONS[code]} - ${pad(m + 1)}/${year}`,
            createdBy
          ]
        );
        executionCount += 1;
      }
    }
    console.log(
      `Presupuesto ${year} (${STATUS_BY_YEAR[year]}) creado: ${LINES[year].length} partidas, ${executionCount} ejecuciones.`
    );
  }

  await connection.commit();
  console.log('Datos demo de presupuesto de Bonaire listos.');
} catch (error) {
  if (connection) await connection.rollback();
  console.error('Seed demo falló:', error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
