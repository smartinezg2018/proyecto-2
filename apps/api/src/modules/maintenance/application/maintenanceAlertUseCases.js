import { AppError } from '../../../shared/errors/AppError.js';
import { alertTargetDate, shouldAlertMaintenance, todayInColombia } from '../domain/maintenanceSchedule.js';

export function createMaintenanceAlertUseCases(
  alertRepository,
  maintenanceRepository,
  buildingRepository,
  clock = todayInColombia
) {
  async function checkBuilding(buildingId) {
    if (!(await buildingRepository.findById(buildingId))) {
      throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
    }
  }

  return {
    async getSettings(buildingId) {
      await checkBuilding(buildingId);
      return alertRepository.getSettings(buildingId);
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

      return alertRepository.saveSettings(buildingId, input.alertDays, userId);
    },

    async list(buildingId) {
      await checkBuilding(buildingId);
      const [settings, maintenances] = await Promise.all([
        alertRepository.getSettings(buildingId),
        maintenanceRepository.findOpenForAlertsByBuilding(buildingId)
      ]);
      const today = clock();

      for (const maintenance of maintenances) {
        if (!shouldAlertMaintenance(maintenance, today, settings.alertDays)) {
          continue;
        }

        await alertRepository.ensureAlert({
          buildingId: maintenance.buildingId,
          maintenanceId: maintenance.id,
          targetDate: alertTargetDate(maintenance)
        });
      }

      const listed = await alertRepository.findByBuilding(buildingId);
      const openById = new Map(maintenances.map((item) => [String(item.id), item]));

      return listed.filter((alert) => {
        if (alert.status !== 'pendiente') {
          return false;
        }

        const maintenance = openById.get(String(alert.maintenanceId));
        if (!maintenance) {
          return false;
        }

        return (
          alert.targetDate === alertTargetDate(maintenance) &&
          shouldAlertMaintenance(maintenance, today, settings.alertDays)
        );
      });
    },

    async markAttended(alertId, userId = null) {
      const alert = await alertRepository.findById(alertId);
      if (!alert) {
        throw new AppError('La alerta de mantenimiento no existe.', 404, 'ALERT_NOT_FOUND');
      }

      if (alert.status === 'atendida') {
        throw new AppError('La alerta ya fue atendida.', 409, 'ALERT_ALREADY_ATTENDED');
      }

      return alertRepository.markAttended(alertId, userId);
    }
  };
}
