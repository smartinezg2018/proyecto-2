import { AppError } from '../../../shared/errors/AppError.js';

export function createProfileUseCases(repository) {
  return {
    async create(input, userId = null) {
      if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
        throw new AppError('El campo name es obligatorio.', 400, 'VALIDATION_ERROR');
      }
      if ([...input.name.trim()].length > 150) {
        throw new AppError('El nombre no puede superar 150 caracteres.', 400, 'VALIDATION_ERROR');
      }
      if (input.description != null && typeof input.description !== 'string') {
        throw new AppError('La descripción debe ser texto.', 400, 'VALIDATION_ERROR');
      }
      if (input.description && Buffer.byteLength(input.description, 'utf8') > 65535) {
        throw new AppError('La descripción es demasiado larga.', 400, 'VALIDATION_ERROR');
      }
      const permissionIds = input.permissionIds === undefined ? [] : input.permissionIds;
      if (!Array.isArray(permissionIds) || permissionIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        throw new AppError('permissionIds debe ser una lista de identificadores enteros positivos.', 400, 'VALIDATION_ERROR');
      }

      return repository.create({
        name: input.name.trim(),
        description: input.description ?? null,
        permissionIds: [...new Set(permissionIds)],
        createdBy: userId
      });
    },

    async listPermissions() {
      return repository.findAllPermissions();
    }
  };
}
