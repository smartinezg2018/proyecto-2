import { AppError } from '../../../shared/errors/AppError.js';
import { colombiaDate } from './insurancePolicyUseCases.js';
import { ClaimDocumentStorage } from '../infrastructure/claimDocumentStorage.js';

export function createInsuranceClaimUseCases(
  claimRepository,
  policyRepository,
  assetRepository,
  buildingRepository,
  clock = colombiaDate,
  documentStorage = new ClaimDocumentStorage()
) {
  async function checkBuilding(buildingId) {
    if (!(await buildingRepository.findById(buildingId))) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }
  }

  return {
    async list(buildingId, filters = {}) {
      await checkBuilding(buildingId);
      return claimRepository.findByBuilding(buildingId, filters);
    },

    async create(buildingId, input, userId = null, files = []) {
      await checkBuilding(buildingId);
      if (input.claimDate > clock()) {
        throw new AppError(
          'La fecha de la reclamación no puede ser futura.',
          400,
          'VALIDATION_ERROR'
        );
      }
      if (input.resolvedAt && input.resolvedAt > clock()) {
        throw new AppError('La fecha de resolución no puede ser futura.', 400, 'VALIDATION_ERROR');
      }

      const policy = await policyRepository.findById(input.policyId);
      if (!policy || Number(policy.buildingId) !== Number(buildingId)) {
        throw new AppError(
          'La póliza no pertenece al edificio seleccionado.',
          400,
          'INVALID_POLICY'
        );
      }

      const assetIds = [...new Set(input.assetIds)];
      const assets = await Promise.all(
        assetIds.map((assetId) => assetRepository.findById(assetId))
      );
      if (assets.some((asset) => !asset || Number(asset.buildingId) !== Number(buildingId))) {
        throw new AppError(
          'Todos los activos deben pertenecer al edificio seleccionado.',
          400,
          'INVALID_ASSET'
        );
      }

      const documents = await documentStorage.save(files);
      try {
        return await claimRepository.create({
          buildingId: Number(buildingId),
          policyId: input.policyId,
          claimDate: input.claimDate,
          description: input.description.trim(),
          status: input.status,
          result: input.result?.trim() || null,
          claimedAmount: input.claimedAmount,
          indemnityAmount: input.indemnityAmount,
          resolvedAt: input.resolvedAt,
          documentRefs: input.documentRefs,
          assetIds,
          createdBy: userId,
          documents
        });
      } catch (error) {
        await documentStorage.remove(documents);
        throw error;
      }
    }
  };
}
