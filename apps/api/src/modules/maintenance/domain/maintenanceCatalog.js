export const MAINTENANCE_TYPES = ['preventivo', 'correctivo'];

export const MAINTENANCE_STATUSES = ['programado', 'en_ejecucion', 'finalizado', 'cancelado'];

export const MAINTENANCE_STATUS_TRANSITIONS = {
  programado: ['en_ejecucion', 'cancelado'],
  // eslint-disable-next-line camelcase
  en_ejecucion: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: []
};
