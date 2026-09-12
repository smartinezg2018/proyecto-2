import { AppError } from '../../../shared/errors/AppError.js';
import { hashPassword } from '../../auth/infrastructure/password.js';

const requiredFields = ['identification', 'name', 'email'];
const fieldLengths = { identification: 50, name: 150, email: 150 };
const userStatuses = ['active', 'inactive'];

function validateUserInput(input) {
  for (const field of requiredFields) {
    if (!input || typeof input[field] !== 'string' || input[field].trim() === '') {
      throw new AppError(`El campo ${field} es obligatorio.`, 400, 'VALIDATION_ERROR');
    }
    if ([...input[field].trim()].length > fieldLengths[field]) {
      throw new AppError(
        `El campo ${field} no puede superar ${fieldLengths[field]} caracteres.`,
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  if (!userStatuses.includes(input.status)) {
    throw new AppError('El campo status debe ser active o inactive.', 400, 'VALIDATION_ERROR');
  }
}

export function createUserUseCases(repository) {
  return {
    async create(input, userId = null) {
      validateUserInput(input);
      const user = {
        identification: input.identification.trim(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        status: input.status,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {})
      };

      if (await repository.findByEmail(user.email)) {
        throw new AppError('Ya existe un usuario con ese correo.', 409, 'DUPLICATE_USER_EMAIL');
      }
      if (await repository.findByIdentification(user.identification)) {
        throw new AppError(
          'Ya existe un usuario con esa identificación.',
          409,
          'DUPLICATE_USER_IDENTIFICATION'
        );
      }

      return repository.create({ ...user, createdBy: userId });
    }
  };
}
