import { AppError } from '../../../shared/errors/AppError.js';
import { isCalendarDate } from '../../assets/domain/calendarDate.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COST = 9999999999999.99;
const CLOSED_STATUSES = ['finalizado', 'cancelado'];

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

function normalizePercentage(value) {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError('El porcentaje de avance debe ser numérico.', 400, 'VALIDATION_ERROR');
  }

  if (amount < 0 || amount > 100) {
    throw new AppError('El porcentaje de avance debe estar entre 0 y 100.', 400, 'VALIDATION_ERROR');
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new AppError(
      'El porcentaje de avance admite como máximo dos decimales.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return amount;
}

function normalizeCost(value) {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError('El costo ejecutado debe ser numérico.', 400, 'VALIDATION_ERROR');
  }

  if (amount < 0) {
    throw new AppError('El costo ejecutado no puede ser negativo.', 400, 'VALIDATION_ERROR');
  }

  if (amount > MAX_COST) {
    throw new AppError('El costo ejecutado excede el máximo permitido.', 400, 'VALIDATION_ERROR');
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new AppError(
      'El costo ejecutado admite como máximo dos decimales.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return amount;
}

function validateProgressInput(input) {
  if (
    typeof input.progressDate !== 'string' ||
    !DATE_PATTERN.test(input.progressDate) ||
    !isCalendarDate(input.progressDate)
  ) {
    throw new AppError(
      'La fecha de avance debe ser una fecha válida (YYYY-MM-DD).',
      400,
      'VALIDATION_ERROR'
    );
  }

  const evidenceValue =
    typeof input.evidenceRef === 'string' ? input.evidenceRef.trim() : input.evidenceRef;
  const evidenceRef =
    evidenceValue === undefined || evidenceValue === null || evidenceValue === ''
      ? null
      : requiredText(input.evidenceRef, 'La evidencia', 255);

  const quoteId = Number(input.quoteId);
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new AppError(
      'Debe indicar con qué cotización se ejecutó el avance.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return {
    quoteId,
    progressDate: input.progressDate,
    percentage: normalizePercentage(input.percentage),
    executedCost: normalizeCost(input.executedCost),
    observations: requiredText(input.observations, 'Las observaciones', 5000),
    evidenceRef
  };
}

export function createProjectProgressUseCases(
  progressRepository,
  projectRepository,
  buildingRepository,
  quoteRepository,
  audit = null
) {
  async function getProjectInBuilding(buildingId, projectId) {
    const building = await buildingRepository.findById(buildingId);
    if (!building) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }

    const project = await projectRepository.findById(projectId);
    if (!project || Number(project.buildingId) !== Number(buildingId)) {
      throw new AppError('El proyecto no existe en este edificio.', 404, 'PROJECT_NOT_FOUND');
    }

    return project;
  }

  return {
    async list(buildingId, projectId) {
      await getProjectInBuilding(buildingId, projectId);
      return progressRepository.findByProject(projectId);
    },

    async register(buildingId, projectId, input, userId = null) {
      const project = await getProjectInBuilding(buildingId, projectId);
      if (CLOSED_STATUSES.includes(project.status)) {
        throw new AppError(
          'No se puede registrar avance en un proyecto cerrado.',
          409,
          'PROJECT_CLOSED'
        );
      }

      const progress = validateProgressInput(input);
      const quote = await quoteRepository.findById(progress.quoteId);
      if (!quote || Number(quote.projectId) !== Number(projectId)) {
        throw new AppError(
          'La cotización no pertenece a este proyecto.',
          404,
          'QUOTE_NOT_FOUND'
        );
      }

      const supplierName = quote.supplier?.name
        ? String(quote.supplier.name).trim()
        : '';
      if (!supplierName) {
        throw new AppError(
          'La cotización no tiene un proveedor asociado.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const saved = await progressRepository.create({
        ...progress,
        projectId: Number(projectId),
        supplierId: quote.supplierId,
        supplierName,
        createdBy: userId
      });

      if (project.status === 'aprobado') {
        await projectRepository.updateStatus(projectId, 'en_ejecucion', userId);
      }

      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'projects',
          entity: 'project_progress',
          entityId: saved.id,
          buildingId: Number(buildingId),
          metadata: {
            projectId: Number(projectId),
            projectName: project.name,
            progressDate: saved.progressDate,
            percentage: saved.percentage,
            executedCost: saved.executedCost,
            quoteId: saved.quoteId,
            supplierId: saved.supplierId,
            supplierName: saved.supplierName,
            evidenceRef: saved.evidenceRef
          }
        });
      }

      return saved;
    }
  };
}
