import { AuthorizationRepository } from '../../../infrastructure/authorizationRepository.js';

const defaultAuthz = new AuthorizationRepository();

export function createEnsureBuildingAccess({ authorization = defaultAuthz } = {}) {
  return async function ensureBuildingAccess(request, response, next) {
    try {
      const buildingId = Number(request.params.buildingId);
      if (!Number.isSafeInteger(buildingId) || buildingId <= 0) {
        response.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Identificador de edificio inválido.',
            requestId: request.id
          }
        });
        return;
      }
      const permissions = request.user?.permissions ?? [];
      if (permissions.includes('admin.all')) {
        next();
        return;
      }
      const allowed = await authorization.hasBuildingAccess(request.user.id, buildingId);
      if (!allowed) {
        response.status(403).json({
          error: {
            code: 'BUILDING_FORBIDDEN',
            message: 'No tiene acceso al edificio solicitado.',
            requestId: request.id
          }
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const ensureBuildingAccess = createEnsureBuildingAccess();
