import { AppError } from '../../../shared/errors/AppError.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateInput(input) {
  if (!Number.isFinite(input.premium) || input.premium < 0) {
    throw new AppError('La prima debe ser numérica y no negativa.', 400, 'VALIDATION_ERROR');
  }
  if (!DATE_PATTERN.test(input.validFrom) || !DATE_PATTERN.test(input.validUntil)) {
    throw new AppError('La vigencia debe tener el formato YYYY-MM-DD.', 400, 'VALIDATION_ERROR');
  }
  if (input.validUntil < input.validFrom) {
    throw new AppError('La fecha final debe ser posterior a la inicial.', 400, 'VALIDATION_ERROR');
  }
  for (const field of ['insurer', 'coverage']) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      throw new AppError(`El campo ${field} es obligatorio.`, 400, 'VALIDATION_ERROR');
    }
  }
}

export function createInsuranceQuoteUseCases(quoteRepository, buildingRepository) {
  return {
    async list(buildingId) {
      if (!(await buildingRepository.findById(buildingId))) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }
      return quoteRepository.findByBuilding(buildingId);
    },

    async create(buildingId, input, userId = null) {
      if (!(await buildingRepository.findById(buildingId))) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }
      validateInput(input);
      return quoteRepository.create({
        buildingId: Number(buildingId),
        insurer: input.insurer.trim(),
        coverage: input.coverage.trim(),
        premium: input.premium,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        documentRef: input.documentRef?.trim() || null,
        createdBy: userId
      });
    }
  };
}