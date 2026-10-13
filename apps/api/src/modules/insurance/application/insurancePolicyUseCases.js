import { AppError } from '../../../shared/errors/AppError.js';
import { isCalendarDate } from '../../assets/domain/calendarDate.js';

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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const POLICY_FIELDS = ['number', 'insurer', 'coverage', 'insuredValue', 'validFrom', 'validUntil'];

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`El campo ${fieldName} es obligatorio.`, 400, 'VALIDATION_ERROR');
  }
}

function assertPeriod(validFrom, validUntil) {
  if (
    typeof validFrom !== 'string' ||
    typeof validUntil !== 'string' ||
    !DATE_PATTERN.test(validFrom) ||
    !DATE_PATTERN.test(validUntil) ||
    !isCalendarDate(validFrom) ||
    !isCalendarDate(validUntil)
  ) {
    throw new AppError('Las fechas deben tener el formato YYYY-MM-DD.', 400, 'VALIDATION_ERROR');
  }
  if (validUntil <= validFrom) {
    throw new AppError('La fecha final debe ser posterior a la inicial.', 400, 'VALIDATION_ERROR');
  }
}

function resolveCoverages(input) {
  const source = Array.isArray(input.coverages)
    ? input.coverages
    : String(input.coverage ?? '').split('\n');
  const coverages = source.map((item) => String(item).trim()).filter(Boolean);
  if (coverages.length === 0 || coverages.some((item) => item.length > 200)) {
    throw new AppError(
      'Debe indicar al menos una cobertura de hasta 200 caracteres.',
      400,
      'VALIDATION_ERROR'
    );
  }
  return coverages;
}

function assertValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new AppError(
      'El valor asegurado debe ser un número mayor o igual a cero.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function sameList(left, right) {
  return left.join('\n') === right.join('\n');
}

export function createInsurancePolicyUseCases(
  repository,
  buildingRepository,
  clock = colombiaDate,
  assetRepository = null,
  audit = null
) {
  async function checkBuilding(buildingId) {
    if (!(await buildingRepository.findById(buildingId))) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }
  }

  async function resolveAssets(buildingId, assetIds) {
    if (assetIds === undefined) return [];
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      throw new AppError(
        'Debe seleccionar al menos un activo del edificio.',
        400,
        'VALIDATION_ERROR'
      );
    }
    const uniqueIds = [...new Set(assetIds.map(Number))];
    if (!assetRepository) {
      throw new AppError('No fue posible validar los activos.', 500, 'ASSET_REPOSITORY_MISSING');
    }
    const assets = await Promise.all(uniqueIds.map((assetId) => assetRepository.findById(assetId)));
    if (assets.some((asset) => !asset || Number(asset.buildingId) !== Number(buildingId))) {
      throw new AppError(
        'Todos los activos deben pertenecer al edificio seleccionado.',
        400,
        'INVALID_ASSET'
      );
    }
    return uniqueIds;
  }

  function normalize(input, assetIds) {
    requiredText(input.number, 'number');
    requiredText(input.insurer, 'insurer');
    assertValue(input.insuredValue);
    assertPeriod(input.validFrom, input.validUntil);
    const coverages = resolveCoverages(input);
    return {
      number: input.number.trim(),
      insurer: input.insurer.trim(),
      coverage: coverages.join('\n'),
      coverages,
      insuredValue: input.insuredValue,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      assetIds
    };
  }

  function changesOf(previous, next) {
    const changes = POLICY_FIELDS.filter(
      (field) => String(previous[field] ?? '') !== String(next[field] ?? '')
    ).map((field) => ({
      field,
      oldValue: previous[field] ?? null,
      newValue: next[field]
    }));
    const previousAssets = (previous.assets ?? [])
      .map((asset) => Number(asset.id))
      .sort((a, b) => a - b);
    const nextAssets = [...next.assetIds].sort((a, b) => a - b);
    if (!sameList(previousAssets.map(String), nextAssets.map(String))) {
      changes.push({
        field: 'assetIds',
        oldValue: previousAssets.join(','),
        newValue: nextAssets.join(',')
      });
    }
    return changes;
  }

  return {
    async list(buildingId, filters = {}) {
      await checkBuilding(buildingId);
      const [policies, settings] = await Promise.all([
        repository.findByBuilding(buildingId),
        repository.getSettings(buildingId)
      ]);
      const today = clock();
      return policies
        .map((policy) => policyExpiration(policy, settings.alertDays, today))
        .filter((policy) => {
          if (
            filters.insurer &&
            !policy.insurer.toLowerCase().includes(filters.insurer.toLowerCase())
          ) {
            return false;
          }
          if (filters.status && policy.expirationStatus !== filters.status) return false;
          if (filters.validUntil && policy.validUntil !== filters.validUntil) return false;
          return true;
        });
    },
    async listByAsset(buildingId, assetId) {
      await checkBuilding(buildingId);
      const assetIds = await resolveAssets(buildingId, [Number(assetId)]);
      const [policies, settings] = await Promise.all([
        repository.findByAsset(buildingId, assetIds[0]),
        repository.getSettings(buildingId)
      ]);
      const today = clock();
      return policies.map((policy) => policyExpiration(policy, settings.alertDays, today));
    },
    async getById(buildingId, policyId) {
      await checkBuilding(buildingId);
      const policy = await repository.findDetailed(policyId);
      if (!policy || Number(policy.buildingId) !== Number(buildingId)) {
        throw new AppError(
          'La póliza no existe en el edificio seleccionado.',
          404,
          'POLICY_NOT_FOUND'
        );
      }
      const settings = await repository.getSettings(buildingId);
      return policyExpiration(policy, settings.alertDays, clock());
    },
    async create(buildingId, input, userId = null) {
      await checkBuilding(buildingId);
      const assetIds = await resolveAssets(buildingId, input.assetIds);
      const policy = normalize(input, assetIds);
      const created = await repository.create(buildingId, policy, userId);
      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'insurance',
          entity: 'insurance_policy',
          entityId: created.id,
          buildingId: Number(buildingId),
          metadata: { number: created.number, insurer: created.insurer, assetIds }
        });
      }
      return created;
    },
    async update(buildingId, policyId, input, userId = null) {
      const current = await this.getById(buildingId, policyId);
      const assetIds = await resolveAssets(
        buildingId,
        input.assetIds === undefined ? current.assets.map((asset) => asset.id) : input.assetIds
      );
      const next = normalize(input, assetIds);
      const changes = changesOf(current, next);
      const updated = await repository.update(policyId, next, userId);
      if (audit && changes.length > 0) {
        await audit.record({
          userId,
          action: 'update',
          module: 'insurance',
          entity: 'insurance_policy',
          entityId: Number(policyId),
          buildingId: Number(buildingId),
          metadata: { changes }
        });
      }
      const settings = await repository.getSettings(buildingId);
      return policyExpiration(updated, settings.alertDays, clock());
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
