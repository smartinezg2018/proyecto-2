import { AppError } from '../../../shared/errors/AppError.js';

export function colombiaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export function policyExpiration(policy, alertDays, today) {
  const daysRemaining = Math.round((Date.parse(policy.validUntil) - Date.parse(today)) / 86400000);
  const expirationStatus =
    daysRemaining < 0
      ? 'Vencida'
      : policy.validFrom > today
        ? 'Pendiente de inicio'
        : daysRemaining <= alertDays
          ? 'Próxima a vencer'
          : 'Vigente';
  return { ...policy, daysRemaining, expirationStatus };
}

export function createInsurancePolicyUseCases(
  repository,
  buildingRepository,
  clock = colombiaDate
) {
  async function checkBuilding(buildingId) {
    if (!(await buildingRepository.findById(buildingId))) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }
  }
  return {
    async list(buildingId, filters = {}) {
      await checkBuilding(buildingId);
      const [policies, settings] = await Promise.all([
        repository.findByBuilding(buildingId, filters),
        repository.getSettings(buildingId)
      ]);
      const today = clock();
      return policies
        .map((policy) => policyExpiration(policy, settings.alertDays, today))
        .filter((policy) => {
          if (!filters.status) return true;
          if (filters.status === 'vencida') return policy.daysRemaining < 0;
          if (filters.status === 'pendiente_de_inicio') return policy.validFrom > today;
          if (filters.status === 'proxima_a_vencer') {
            return (
              policy.validFrom <= today &&
              policy.daysRemaining >= 0 &&
              policy.daysRemaining <= settings.alertDays
            );
          }
          return policy.validFrom <= today && policy.daysRemaining > settings.alertDays;
        });
    },
    async create(buildingId, input, userId = null) {
      await checkBuilding(buildingId);
      return repository.create(buildingId, input, userId);
    },
    async update(buildingId, policyId, input, userId = null) {
      await checkBuilding(buildingId);
      const updated = await repository.update(buildingId, policyId, input, userId);
      if (!updated) {
        throw new AppError('La pÃ³liza no existe.', 404, 'POLICY_NOT_FOUND');
      }
      return updated;
    },
    async assignAssets(buildingId, policyId, assetIds, userId = null) {
      await checkBuilding(buildingId);
      return repository.replaceAssets(buildingId, policyId, assetIds, userId);
    },
    async getSettings(buildingId) {
      await checkBuilding(buildingId);
      return repository.getSettings(buildingId);
    },
    async saveSettings(buildingId, input, userId = null) {
      await checkBuilding(buildingId);
      if (!Number.isInteger(input.alertDays) || input.alertDays < 0 || input.alertDays > 365) {
        throw new AppError(
          'La anticipación debe ser un entero entre 0 y 365 días.',
          400,
          'VALIDATION_ERROR'
        );
      }
      return repository.saveSettings(buildingId, input.alertDays, userId);
    }
  };
}
