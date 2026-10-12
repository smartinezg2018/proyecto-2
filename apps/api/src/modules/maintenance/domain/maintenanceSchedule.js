export function todayInColombia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export const MAINTENANCE_FREQUENCIES = [
  'unica',
  'semanal',
  'quincenal',
  'mensual',
  'trimestral',
  'semestral',
  'anual'
];

export function addFrequency(dateString, frequency) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (frequency === 'semanal') {
    date.setUTCDate(date.getUTCDate() + 7);
  } else if (frequency === 'quincenal') {
    date.setUTCDate(date.getUTCDate() + 15);
  } else if (frequency === 'mensual') {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else if (frequency === 'trimestral') {
    date.setUTCMonth(date.getUTCMonth() + 3);
  } else if (frequency === 'semestral') {
    date.setUTCMonth(date.getUTCMonth() + 6);
  } else if (frequency === 'anual') {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }

  return date.toISOString().slice(0, 10);
}

export function resolveNextExecutionDate(maintenanceDate, frequency, providedDate) {
  if (providedDate) {
    return providedDate;
  }

  return addFrequency(maintenanceDate, frequency);
}

export function alertTargetDate(maintenance) {
  return maintenance.maintenanceDate || null;
}

export function shouldAlertMaintenance(maintenance, today, alertDays) {
  const targetDate = alertTargetDate(maintenance);
  if (!targetDate) {
    return false;
  }

  const daysRemaining = Math.round((Date.parse(targetDate) - Date.parse(today)) / 86400000);
  return daysRemaining <= alertDays;
}
