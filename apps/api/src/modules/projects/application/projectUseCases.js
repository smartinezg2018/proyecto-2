import { AppError } from '../../../shared/errors/AppError.js';
import { isCalendarDate } from '../../assets/domain/calendarDate.js';
import { INITIAL_PROJECT_STATUS, PROJECT_STATUSES, PROJECT_TYPES } from '../domain/projectCatalog.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BUDGET = 9999999999999.99;

function requiredText(value, fieldLabel, maxLength) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldLabel} es obligatorio.`, 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(
      `${fieldLabel} no puede superar ${maxLength} caracteres.`,
      400,
      'VALIDATION_ERROR'
    );
  }

  return trimmed;
}

function validateDate(value, fieldLabel) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || !isCalendarDate(value)) {
    throw new AppError(
      `${fieldLabel} debe ser una fecha válida (YYYY-MM-DD).`,
      400,
      'VALIDATION_ERROR'
    );
  }

  return value;
}

function normalizeBudget(value) {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError('El presupuesto debe ser numérico.', 400, 'VALIDATION_ERROR');
  }

  if (amount < 0) {
    throw new AppError('El presupuesto no puede ser negativo.', 400, 'VALIDATION_ERROR');
  }

  if (amount > MAX_BUDGET) {
    throw new AppError('El presupuesto excede el valor máximo permitido.', 400, 'VALIDATION_ERROR');
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new AppError('El presupuesto admite como máximo dos decimales.', 400, 'VALIDATION_ERROR');
  }

  return amount;
}

function validateRegisterInput(input) {
  const name = requiredText(input.name, 'El nombre del proyecto', 200);
  const objective = requiredText(input.objective, 'El objetivo del proyecto', 5000);
  const responsible = requiredText(input.responsible, 'El responsable del proyecto', 150);
  const approvalReference = requiredText(
    input.approvalReference,
    'La referencia de aprobación',
    255
  );

  if (!PROJECT_TYPES.includes(input.projectType)) {
    throw new AppError(
      'El tipo de proyecto debe ser obra, mejora, mantenimiento u otro.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const startDate = validateDate(input.startDate, 'La fecha de inicio');
  const endDate = validateDate(input.endDate, 'La fecha de fin');
  if (endDate < startDate) {
    throw new AppError(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return {
    name,
    objective,
    projectType: input.projectType,
    budget: normalizeBudget(input.budget),
    startDate,
    endDate,
    responsible,
    approvalReference,
    status: INITIAL_PROJECT_STATUS
  };
}

function parseListFilters(input = {}) {
  const filters = {};
  if (input.status) {
    if (!PROJECT_STATUSES.includes(input.status)) {
      throw new AppError('El estado del proyecto no es válido.', 400, 'VALIDATION_ERROR');
    }
    filters.status = input.status;
  }

  if (input.projectType) {
    if (!PROJECT_TYPES.includes(input.projectType)) {
      throw new AppError(
        'El tipo de proyecto debe ser obra, mejora, mantenimiento u otro.',
        400,
        'VALIDATION_ERROR'
      );
    }
    filters.projectType = input.projectType;
  }

  if (input.dateFrom) {
    filters.dateFrom = validateDate(input.dateFrom, 'La fecha inicial');
  }
  if (input.dateTo) {
    filters.dateTo = validateDate(input.dateTo, 'La fecha final');
  }
  if (filters.dateFrom && filters.dateTo && filters.dateTo < filters.dateFrom) {
    throw new AppError(
      'La fecha final no puede ser anterior a la fecha inicial.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return filters;
}

export function createProjectUseCases(projectRepository, buildingRepository, audit = null) {
  async function getBuilding(buildingId) {
    const building = await buildingRepository.findById(buildingId);
    if (!building) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }
    return building;
  }

  return {
    async register(buildingId, input, userId = null) {
      await getBuilding(buildingId);
      const project = validateRegisterInput(input);
      const saved = await projectRepository.create({
        ...project,
        buildingId: Number(buildingId),
        createdBy: userId,
        updatedBy: userId
      });

      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'projects',
          entity: 'project',
          entityId: saved.id,
          buildingId: Number(buildingId),
          metadata: {
            name: saved.name,
            projectType: saved.projectType,
            budget: saved.budget,
            startDate: saved.startDate,
            endDate: saved.endDate,
            responsible: saved.responsible,
            approvalReference: saved.approvalReference,
            status: saved.status
          }
        });
      }

      return saved;
    },

    async listByBuilding(buildingId, filters = {}) {
      await getBuilding(buildingId);
      return projectRepository.findByBuilding(buildingId, parseListFilters(filters));
    }
  };
}
