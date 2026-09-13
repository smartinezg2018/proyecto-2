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

export function createUserUseCases(repository, audit = null) {
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

      const created = await repository.create({ ...user, createdBy: userId });
      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'administration',
          entity: 'user',
          entityId: created.id,
          metadata: { email: created.email }
        });
      }
      return created;
    },

    async list() {
      return repository.findAll();
    },

    async assignProfiles(userId, input, actorId = null) {
      const profileIds = normalizeIdList(input?.profileIds, 'profileIds');
      await repository.replaceProfiles(userId, profileIds, actorId);
      if (audit) {
        await audit.record({
          userId: actorId,
          action: 'assign_profile',
          module: 'administration',
          entity: 'user',
          entityId: userId,
          metadata: { profileIds }
        });
      }
      return { userId, profileIds };
    },

    async listProfiles(userId) {
      const user = await repository.findById(userId);
      if (!user) {
        throw new AppError('El usuario no existe.', 404, 'USER_NOT_FOUND');
      }
      return repository.findProfileIds(userId);
    },

    async assignBuildings(userId, input, actorId = null) {
      const buildingIds = normalizeIdList(input?.buildingIds, 'buildingIds');
      await repository.replaceBuildings(userId, buildingIds, actorId);
      if (audit) {
        await audit.record({
          userId: actorId,
          action: 'assign_building',
          module: 'administration',
          entity: 'user',
          entityId: userId,
          metadata: { buildingIds }
        });
      }
      return { userId, buildingIds };
    },

    async listBuildings(userId) {
      const user = await repository.findById(userId);
      if (!user) {
        throw new AppError('El usuario no existe.', 404, 'USER_NOT_FOUND');
      }
      return repository.findBuildingIds(userId);
    }
  };
}

function normalizeIdList(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new AppError(
      `${fieldName} debe ser una lista de identificadores enteros positivos.`,
      400,
      'VALIDATION_ERROR'
    );
  }
  if (value.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new AppError(
      `${fieldName} debe ser una lista de identificadores enteros positivos.`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return [...new Set(value)];
}
