import { AppError } from '../../../shared/errors/AppError.js';
import { PROPERTY_KINDS } from '../domain/propertyKinds.js';
import { UNIT_STATUSES } from '../domain/unitStatuses.js';

export { PROPERTY_KINDS, UNIT_STATUSES };

function validateUnitInput(input) {
  if (typeof input.number !== 'string' || input.number.trim() === '') {
    throw new AppError('El número del inmueble es obligatorio.', 400, 'VALIDATION_ERROR');
  }

  if (input.tower !== undefined && input.tower !== null && typeof input.tower !== 'string') {
    throw new AppError('La torre o bloque debe ser texto.', 400, 'VALIDATION_ERROR');
  }

  const kind = input.kind || 'apartamento';
  if (!PROPERTY_KINDS.includes(kind)) {
    throw new AppError(
      'El tipo de inmueble no es válido. Use apartamento o parqueadero.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const coefficient = Number(input.coefficient);
  if (!Number.isFinite(coefficient) || coefficient < 0 || coefficient > 100) {
    throw new AppError('El coeficiente debe ser un número entre 0 y 100.', 400, 'VALIDATION_ERROR');
  }

  if (!UNIT_STATUSES.includes(input.status)) {
    throw new AppError(
      'El estado del inmueble no es válido. Use ocupada, desocupada o inhabitada.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function normalizeUnitInput(input, buildingId) {
  return {
    buildingId: Number(buildingId),
    number: input.number.trim(),
    tower: input.tower?.trim() || '',
    kind: input.kind || 'apartamento',
    coefficient: Number(input.coefficient),
    status: input.status
  };
}

export function createUnitUseCases(unitRepository, buildingRepository) {
  return {
    async create(buildingId, input, userId = null) {
      const building = await buildingRepository.findById(buildingId);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      validateUnitInput(input);
      const unit = normalizeUnitInput(input, buildingId);

      if (
        await unitRepository.findByBuildingNumberAndTower(unit.buildingId, unit.number, unit.tower)
      ) {
        throw new AppError(
          'Ya existe un inmueble con ese número y torre en el edificio.',
          409,
          'DUPLICATE_UNIT'
        );
      }

      return unitRepository.create({ ...unit, createdBy: userId });
    },

    async listByBuilding(buildingId) {
      const building = await buildingRepository.findById(buildingId);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      return unitRepository.findAllByBuilding(buildingId);
    }
  };
}
