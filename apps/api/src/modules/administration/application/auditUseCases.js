import { AppError } from '../../../shared/errors/AppError.js';

const MAX_PAGE_SIZE = 100;

export function createAuditUseCases(repository) {
  return {
    async list(query = {}) {
      const page = parsePositiveInt(query.page, 1);
      const pageSize = Math.min(parsePositiveInt(query.pageSize, 20), MAX_PAGE_SIZE);
      const filters = {
        page,
        pageSize,
        userId: parseOptionalId(query.userId, 'userId'),
        buildingId: parseOptionalId(query.buildingId, 'buildingId'),
        module: parseOptionalString(query.module),
        entity: parseOptionalString(query.entity),
        from: parseOptionalDate(query.from, 'from'),
        to: parseOptionalDate(query.to, 'to')
      };
      if (filters.from && filters.to && filters.from > filters.to) {
        throw new AppError('El rango de fechas es inválido.', 400, 'VALIDATION_ERROR');
      }
      const { items, total } = await repository.find(filters);
      return { items, total, page, pageSize };
    }
  };
}

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError('Parámetro de paginación inválido.', 400, 'VALIDATION_ERROR');
  }
  return parsed;
}

function parseOptionalId(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} debe ser un entero positivo.`, 400, 'VALIDATION_ERROR');
  }
  return parsed;
}

function parseOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} debe ser una fecha válida.`, 400, 'VALIDATION_ERROR');
  }
  return parsed
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}
