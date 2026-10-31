import { AppError } from '../../../shared/errors/AppError.js';
import { isCalendarDate } from '../../assets/domain/calendarDate.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 9999999999999.99;

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

function normalizeAmount(value) {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError('El valor de la cotización debe ser numérico.', 400, 'VALIDATION_ERROR');
  }

  if (amount < 0) {
    throw new AppError('El valor de la cotización no puede ser negativo.', 400, 'VALIDATION_ERROR');
  }

  if (amount > MAX_AMOUNT) {
    throw new AppError(
      'El valor de la cotización excede el máximo permitido.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new AppError(
      'El valor de la cotización admite como máximo dos decimales.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return amount;
}

function validateQuoteInput(input) {
  const supplierId = Number(input.supplierId);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    throw new AppError('El proveedor es obligatorio.', 400, 'VALIDATION_ERROR');
  }

  if (
    typeof input.validUntil !== 'string' ||
    !DATE_PATTERN.test(input.validUntil) ||
    !isCalendarDate(input.validUntil)
  ) {
    throw new AppError(
      'La vigencia debe ser una fecha válida (YYYY-MM-DD).',
      400,
      'VALIDATION_ERROR'
    );
  }

  const documentValue =
    typeof input.documentRef === 'string' ? input.documentRef.trim() : input.documentRef;
  const documentRef =
    documentValue === undefined || documentValue === null || documentValue === ''
      ? null
      : requiredText(input.documentRef, 'El documento', 255);

  return {
    supplierId,
    amount: normalizeAmount(input.amount),
    validUntil: input.validUntil,
    scope: requiredText(input.scope, 'El alcance', 5000),
    documentRef
  };
}

export function createProjectQuoteUseCases(
  quoteRepository,
  projectRepository,
  buildingRepository,
  supplierRepository,
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
      return quoteRepository.findByProject(projectId);
    },

    async register(buildingId, projectId, input, userId = null) {
      const project = await getProjectInBuilding(buildingId, projectId);
      const quote = validateQuoteInput(input);
      const supplier = await supplierRepository.findById(quote.supplierId);
      if (!supplier) {
        throw new AppError('El proveedor no existe.', 404, 'SUPPLIER_NOT_FOUND');
      }

      const saved = await quoteRepository.create({
        ...quote,
        projectId: Number(projectId),
        createdBy: userId
      });

      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'projects',
          entity: 'project_quote',
          entityId: saved.id,
          buildingId: Number(buildingId),
          metadata: {
            projectId: Number(projectId),
            projectName: project.name,
            supplierId: saved.supplierId,
            amount: saved.amount,
            validUntil: saved.validUntil,
            documentRef: saved.documentRef
          }
        });
      }

      return saved;
    }
  };
}
