import { AppError } from '../../../shared/errors/AppError.js';

const requiredFields = ['name', 'identification', 'address'];

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
    identification: input.identification.trim(),
    address: input.address.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null
  };
}

export function createBuildingUseCases(repository) {
  return {
    async create(input, userId = null) {
      validateBuildingInput(input);
      const building = normalizeBuildingInput(input);

      if (await repository.findByIdentification(building.identification)) {
        throw new AppError('Ya existe un edificio con esa identificación.', 409, 'DUPLICATE_BUILDING');
      }

      return repository.create({ ...building, createdBy: userId });
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
      if (await repository.findByIdentification(building.identification, id)) {
        throw new AppError('Ya existe un edificio con esa identificación.', 409, 'DUPLICATE_BUILDING');
      }

      return repository.update(id, { ...building, updatedBy: userId });
    }
  };
}