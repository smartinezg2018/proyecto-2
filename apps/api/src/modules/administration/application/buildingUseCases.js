import { AppError } from '../../../shared/errors/AppError.js';

const requiredFields = ['name', 'nit', 'address'];

function validateBuildingInput(input) {
  for (const field of requiredFields) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      throw new AppError(`El campo ${field} es obligatorio.`, 400, 'VALIDATION_ERROR');
    }
  }

  if (input.phone !== undefined && input.phone !== null && typeof input.phone !== 'string') {
    throw new AppError('El teléfono debe ser texto.', 400, 'VALIDATION_ERROR');
  }

  if (input.email !== undefined && input.email !== null && typeof input.email !== 'string') {
    throw new AppError('El correo debe ser texto.', 400, 'VALIDATION_ERROR');
  }
}

function normalizeBuildingInput(input) {
  return {
    name: input.name.trim(),
    nit: input.nit.trim(),
    address: input.address.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null
  };
}

export function createBuildingUseCases(repository, audit = null) {
  return {
    async create(input, userId = null) {
      validateBuildingInput(input);
      const building = normalizeBuildingInput(input);

      if (await repository.findByNit(building.nit)) {
        throw new AppError('Ya existe un edificio con ese NIT.', 409, 'DUPLICATE_BUILDING');
      }

      const created = await repository.create({ ...building, createdBy: userId });
      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'administration',
          entity: 'building',
          entityId: created.id,
          buildingId: created.id,
          metadata: { name: created.name, nit: created.nit }
        });
      }
      return created;
    },

    async list() {
      return repository.findAll();
    },

    async getById(id) {
      const building = await repository.findById(id);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      return building;
    },

    async update(id, input, userId = null) {
      validateBuildingInput(input);
      const building = normalizeBuildingInput(input);

      await this.getById(id);
      if (await repository.findByNit(building.nit, id)) {
        throw new AppError('Ya existe un edificio con ese NIT.', 409, 'DUPLICATE_BUILDING');
      }

      const updated = await repository.update(id, { ...building, updatedBy: userId });
      if (audit) {
        await audit.record({
          userId,
          action: 'update',
          module: 'administration',
          entity: 'building',
          entityId: updated.id,
          buildingId: updated.id,
          metadata: { name: updated.name, nit: updated.nit }
        });
      }
      return updated;
    }
  };
}
