export const ASSETS = [
  {
    id: 'ACT-001',
    name: 'Ascensor Torre A',
    category: 'Electromecánico',
    location: 'Torre A · Subsuelo',
    status: 'Activo',
    provider: 'KONE Colombia',
    cost: 85000000
  },
  {
    id: 'ACT-002',
    name: 'Planta Eléctrica',
    category: 'Eléctrico',
    location: 'Cuarto de Máquinas',
    status: 'Mantenimiento',
    provider: 'Caterpillar',
    cost: 42000000
  },
  {
    id: 'ACT-003',
    name: 'Sistema CCTV',
    category: 'Seguridad',
    location: 'Portería Principal',
    status: 'Activo',
    provider: 'Hikvision',
    cost: 15600000
  },
  {
    id: 'ACT-004',
    name: 'Bomba de Agua Principal',
    category: 'Hidráulico',
    location: 'Cuarto de Bombas',
    status: 'Activo',
    provider: 'Grundfos',
    cost: 18500000
  },
  {
    id: 'ACT-005',
    name: 'Portón Vehicular',
    category: 'Accesos',
    location: 'Entrada Principal',
    status: 'Activo',
    provider: 'CAME Colombia',
    cost: 8200000
  },
  {
    id: 'ACT-006',
    name: 'Ascensor Torre B',
    category: 'Electromecánico',
    location: 'Torre B · Subsuelo',
    status: 'Dado de Baja',
    provider: 'KONE Colombia',
    cost: 85000000
  },
  {
    id: 'ACT-007',
    name: 'Sistema Contra Incendios',
    category: 'Seguridad',
    location: 'Todos los pisos',
    status: 'Activo',
    provider: 'Minimax',
    cost: 32000000
  },
  {
    id: 'ACT-008',
    name: 'Caldera de Gas',
    category: 'Calefacción',
    location: 'Cuarto Técnico P1',
    status: 'Mantenimiento',
    provider: 'Bosch Termotecnia',
    cost: 24000000
  }
];

export const KANBAN = {
  programado: [
    {
      id: 'M-001',
      title: 'Mantenimiento Preventivo Ascensor Torre A',
      asset: 'ACT-001',
      type: 'Preventivo',
      date: '2026-08-10',
      responsible: 'TécnicoElevadores S.A.S',
      priority: 'Alta'
    },
    {
      id: 'M-002',
      title: 'Revisión Sistema Eléctrico Zonas Comunes',
      asset: 'ACT-002',
      type: 'Preventivo',
      date: '2026-08-15',
      responsible: 'ElectroServicios Ltda.',
      priority: 'Media'
    },
    {
      id: 'M-003',
      title: 'Limpieza Tanques de Agua',
      asset: 'ACT-004',
      type: 'Preventivo',
      date: '2026-08-20',
      responsible: 'AquaClean SAS',
      priority: 'Media'
    }
  ],
  enProceso: [
    {
      id: 'M-004',
      title: 'Reparación Planta Eléctrica',
      asset: 'ACT-002',
      type: 'Correctivo',
      date: '2026-08-03',
      responsible: 'Caterpillar Service',
      priority: 'Alta'
    },
    {
      id: 'M-005',
      title: 'Calibración Cámaras CCTV',
      asset: 'ACT-003',
      type: 'Preventivo',
      date: '2026-08-01',
      responsible: 'Hikvision Tech',
      priority: 'Baja'
    }
  ],
  completado: [
    {
      id: 'M-006',
      title: 'Cambio de aceite Portón Vehicular',
      asset: 'ACT-005',
      type: 'Preventivo',
      date: '2026-07-28',
      responsible: 'CAME Colombia',
      priority: 'Baja'
    },
    {
      id: 'M-007',
      title: 'Recarga Extintores Planta 1-5',
      asset: 'ACT-007',
      type: 'Preventivo',
      date: '2026-07-25',
      responsible: 'FireTech SAS',
      priority: 'Media'
    }
  ]
};

export const POLICIES = [
  {
    id: 'POL-2025-001',
    insurer: 'Seguros Bolívar',
    asset: 'Edificio Completo',
    coverage: 'Todo Riesgo Propiedad Horizontal',
    value: 2500000000,
    start: '2025-01-01',
    end: '2026-01-01',
    daysLeft: 151
  },
  {
    id: 'POL-2025-002',
    insurer: 'AXA Colpatria',
    asset: 'Ascensor Torre A',
    coverage: 'Responsabilidad Civil',
    value: 500000000,
    start: '2025-03-01',
    end: '2026-02-28',
    daysLeft: 209
  },
  {
    id: 'POL-2025-003',
    insurer: 'Allianz Colombia',
    asset: 'Planta Eléctrica',
    coverage: 'Rotura de Maquinaria',
    value: 150000000,
    start: '2025-06-01',
    end: '2026-08-25',
    daysLeft: 22
  },
  {
    id: 'POL-2025-004',
    insurer: 'Seguros del Estado',
    asset: 'CCTV + Accesos',
    coverage: 'Hurto y Daño Electrónico',
    value: 80000000,
    start: '2025-07-01',
    end: '2026-08-18',
    daysLeft: 15
  },
  {
    id: 'POL-2025-005',
    insurer: 'Mapfre Colombia',
    asset: 'Áreas Comunes',
    coverage: 'RC Extracontractual',
    value: 300000000,
    start: '2024-12-01',
    end: '2025-11-30',
    daysLeft: 119
  }
];

export const APARTMENTS = [
  {
    unit: '101',
    owner: 'Carlos Andrés Martínez',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-07-05'
  },
  {
    unit: '102',
    owner: 'Sandra Patricia López',
    status: 'En mora',
    daysLate: 45,
    balance: 892000,
    lastPayment: '2026-06-15'
  },
  {
    unit: '201',
    owner: 'Familia Rodríguez Pinto',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-08-01'
  },
  {
    unit: '202',
    owner: 'Inversiones Inmobiliarias SAS',
    status: 'En mora',
    daysLate: 92,
    balance: 2145000,
    lastPayment: '2026-05-10'
  },
  {
    unit: '301',
    owner: 'Diego Hernando Vargas',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-07-28'
  },
  {
    unit: '302',
    owner: 'María Camila Torres',
    status: 'En mora',
    daysLate: 15,
    balance: 446000,
    lastPayment: '2026-07-01'
  },
  {
    unit: '401',
    owner: 'Luis Felipe Gómez',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-08-02'
  },
  {
    unit: '402',
    owner: 'Adriana Milena Castro',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-07-30'
  },
  {
    unit: '501',
    owner: 'Roberto Carlos Pardo',
    status: 'En mora',
    daysLate: 68,
    balance: 1560000,
    lastPayment: '2026-05-28'
  },
  {
    unit: '502',
    owner: 'Claudia Viviana Niño',
    status: 'Al día',
    daysLate: 0,
    balance: 0,
    lastPayment: '2026-07-20'
  }
];

export const BUDGET_ITEMS = [
  {
    category: 'Mantenimiento',
    rubro: 'Mantenimiento Preventivo Ascensores',
    projected: 48000000,
    executed: 32000000
  },
  {
    category: 'Mantenimiento',
    rubro: 'Mantenimiento Red Eléctrica',
    projected: 18000000,
    executed: 21500000
  },
  {
    category: 'Seguridad',
    rubro: 'Vigilancia y Portería',
    projected: 96000000,
    executed: 54000000
  },
  {
    category: 'Servicios',
    rubro: 'Aseo y Limpieza Zonas Comunes',
    projected: 36000000,
    executed: 22000000
  },
  { category: 'Servicios', rubro: 'Agua Zonas Comunes', projected: 14400000, executed: 9800000 },
  {
    category: 'Administración',
    rubro: 'Honorarios Administrador',
    projected: 42000000,
    executed: 28000000
  },
  { category: 'Seguros', rubro: 'Pólizas de Seguros', projected: 32000000, executed: 31200000 },
  {
    category: 'Proyectos',
    rubro: 'Reparación Cubierta Torre B',
    projected: 65000000,
    executed: 28000000
  }
];

export const BILLING_CHART = [
  { mes: 'Feb', recaudo: 8200000, mora: 1800000 },
  { mes: 'Mar', recaudo: 9100000, mora: 1400000 },
  { mes: 'Abr', recaudo: 8700000, mora: 2100000 },
  { mes: 'May', recaudo: 7900000, mora: 2900000 },
  { mes: 'Jun', recaudo: 8500000, mora: 2200000 },
  { mes: 'Jul', recaudo: 9400000, mora: 1600000 }
];

export const PROJECTS = [
  {
    id: 'P-001',
    name: 'Reparación Cubierta Torre B',
    status: 'En Curso',
    budget: 65000000,
    spent: 28000000,
    progress: 43,
    deadline: '2026-10-15',
    approved: 'Asamblea Extraordinaria · Jun 2026'
  },
  {
    id: 'P-002',
    name: 'Renovación Salón Comunal',
    status: 'Aprobado',
    budget: 38000000,
    spent: 0,
    progress: 0,
    deadline: '2026-12-01',
    approved: 'Asamblea Ordinaria · Mar 2026'
  },
  {
    id: 'P-003',
    name: 'Impermeabilización Terrazas',
    status: 'Finalizado',
    budget: 22000000,
    spent: 21400000,
    progress: 100,
    deadline: '2026-06-30',
    approved: 'Asamblea Ordinaria · Ene 2026'
  },
  {
    id: 'P-004',
    name: 'Automatización Parqueaderos',
    status: 'En Curso',
    budget: 85000000,
    spent: 42000000,
    progress: 49,
    deadline: '2026-09-30',
    approved: 'Asamblea Extraordinaria · Abr 2026'
  }
];

export const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);

export const formatCompactCurrency = (value) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
};

/** Datos demo del panel general por NIT de edificio (módulos aún no implementados). */
export const BUILDING_DASHBOARDS = {
  '900111001': {
    policies: POLICIES,
    apartments: APARTMENTS,
    billingChart: BILLING_CHART,
    maintenanceInProgress: KANBAN.enProceso,
    budgetExecutionPercent: 58,
    activePolicies: 5,
    policiesExpiringSoon: 2
  },
  '900111002': {
    policies: [
      {
        id: 'POL-TC-001',
        insurer: 'Sura',
        asset: 'Edificio Completo',
        coverage: 'Todo Riesgo PH',
        value: 1800000000,
        start: '2025-04-01',
        end: '2026-09-20',
        daysLeft: 7
      },
      {
        id: 'POL-TC-002',
        insurer: 'Bolívar',
        asset: 'Ascensores',
        coverage: 'Responsabilidad Civil',
        value: 400000000,
        start: '2025-01-15',
        end: '2026-10-01',
        daysLeft: 18
      },
      {
        id: 'POL-TC-003',
        insurer: 'Allianz',
        asset: 'Áreas comunes',
        coverage: 'RC Extracontractual',
        value: 220000000,
        start: '2025-06-01',
        end: '2026-12-01',
        daysLeft: 79
      }
    ],
    apartments: [
      {
        unit: 'A-101',
        owner: 'Julián Restrepo',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-08-01'
      },
      {
        unit: 'A-102',
        owner: 'Natalia Mejía',
        status: 'En mora',
        daysLate: 32,
        balance: 720000,
        lastPayment: '2026-07-01'
      },
      {
        unit: 'B-201',
        owner: 'Constructora Andes',
        status: 'En mora',
        daysLate: 75,
        balance: 1890000,
        lastPayment: '2026-05-20'
      },
      {
        unit: 'B-202',
        owner: 'Sofía Ardila',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-08-03'
      },
      {
        unit: 'C-301',
        owner: 'Héctor Pinzón',
        status: 'En mora',
        daysLate: 12,
        balance: 380000,
        lastPayment: '2026-07-20'
      },
      {
        unit: 'C-302',
        owner: 'Valentina Ortiz',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-07-29'
      }
    ],
    billingChart: [
      { mes: 'Feb', recaudo: 6100000, mora: 2100000 },
      { mes: 'Mar', recaudo: 6400000, mora: 1900000 },
      { mes: 'Abr', recaudo: 5900000, mora: 2500000 },
      { mes: 'May', recaudo: 6700000, mora: 1800000 },
      { mes: 'Jun', recaudo: 7000000, mora: 1600000 },
      { mes: 'Jul', recaudo: 7200000, mora: 1400000 }
    ],
    maintenanceInProgress: [
      {
        id: 'M-TC-01',
        title: 'Cambio de bombillas zonas comunes',
        responsible: 'ElectroCentral',
        type: 'Correctivo',
        priority: 'Media'
      },
      {
        id: 'M-TC-02',
        title: 'Revisión de bombas de impulsión',
        responsible: 'Hidráulica Plus',
        type: 'Preventivo',
        priority: 'Alta'
      }
    ],
    budgetExecutionPercent: 41,
    activePolicies: 3,
    policiesExpiringSoon: 2
  },
  '900111003': {
    policies: [
      {
        id: 'POL-LR-001',
        insurer: 'Mapfre',
        asset: 'Edificio Completo',
        coverage: 'Todo Riesgo PH',
        value: 1200000000,
        start: '2025-09-01',
        end: '2026-09-01',
        daysLeft: 353
      },
      {
        id: 'POL-LR-002',
        insurer: 'Estado',
        asset: 'Portón y CCTV',
        coverage: 'Hurto y daño',
        value: 90000000,
        start: '2025-05-01',
        end: '2026-08-28',
        daysLeft: 15
      }
    ],
    apartments: [
      {
        unit: '1A',
        owner: 'Camila Rueda',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-08-02'
      },
      {
        unit: '1B',
        owner: 'Andrés Quintero',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-07-31'
      },
      {
        unit: '2A',
        owner: 'Familia Cárdenas',
        status: 'En mora',
        daysLate: 21,
        balance: 510000,
        lastPayment: '2026-07-10'
      },
      {
        unit: '2B',
        owner: 'Inmobiliaria Robles',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-08-01'
      }
    ],
    billingChart: [
      { mes: 'Feb', recaudo: 4200000, mora: 800000 },
      { mes: 'Mar', recaudo: 4500000, mora: 600000 },
      { mes: 'Abr', recaudo: 4300000, mora: 900000 },
      { mes: 'May', recaudo: 4700000, mora: 500000 },
      { mes: 'Jun', recaudo: 4600000, mora: 700000 },
      { mes: 'Jul', recaudo: 4900000, mora: 400000 }
    ],
    maintenanceInProgress: [
      {
        id: 'M-LR-01',
        title: 'Poda y jardinería perímetro',
        responsible: 'Verde Urbano',
        type: 'Preventivo',
        priority: 'Baja'
      }
    ],
    budgetExecutionPercent: 72,
    activePolicies: 2,
    policiesExpiringSoon: 1
  }
};

export function getBuildingDashboard(building) {
  if (!building) return null;
  const byNit = BUILDING_DASHBOARDS[building.nit];
  if (byNit) return byNit;

  const seed = Number(String(building.id ?? 1)) || 1;
  const moraBase = 350000 * (seed % 5);
  return {
    policies: [
      {
        id: `POL-${building.id}-001`,
        insurer: 'Seguros Demo',
        asset: 'Edificio completo',
        coverage: 'Todo Riesgo PH',
        value: 1000000000 + seed * 10000000,
        start: '2025-01-01',
        end: '2026-09-30',
        daysLeft: 10 + (seed % 40)
      }
    ],
    apartments: [
      {
        unit: '101',
        owner: 'Propietario 1',
        status: 'Al día',
        daysLate: 0,
        balance: 0,
        lastPayment: '2026-08-01'
      },
      {
        unit: '102',
        owner: 'Propietario 2',
        status: 'En mora',
        daysLate: 20 + seed,
        balance: moraBase + 200000,
        lastPayment: '2026-06-15'
      }
    ],
    billingChart: BILLING_CHART.map((row) => ({
      ...row,
      recaudo: Math.round(row.recaudo * (0.7 + (seed % 4) * 0.1)),
      mora: Math.round(row.mora * (0.8 + (seed % 3) * 0.15))
    })),
    maintenanceInProgress: [
      {
        id: `M-${building.id}-01`,
        title: 'Revisión general de instalaciones',
        responsible: 'Proveedor asignado',
        type: 'Preventivo',
        priority: 'Media'
      }
    ],
    budgetExecutionPercent: 35 + (seed % 50),
    activePolicies: 1,
    policiesExpiringSoon: 1
  };
}
