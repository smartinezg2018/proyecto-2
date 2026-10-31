import { ProjectProgress } from '../../../../database/models/index.js';

function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mapProjectProgress(entry) {
  if (!entry) return null;
  const data = entry.get ? entry.get({ plain: true }) : entry;
  return {
    id: data.id,
    projectId: data.projectId,
    progressDate: formatDate(data.progressDate),
    percentage: Number(data.percentage),
    executedCost: Number(data.executedCost),
    observations: data.observations,
    evidenceRef: data.evidenceRef,
    quoteId: data.quoteId ?? null,
    supplierId: data.supplierId ?? null,
    supplierName: data.supplierName ?? null,
    createdBy: data.createdBy,
    createdAt: data.createdAt
  };
}

export class ProjectProgressRepository {
  async create(input) {
    const created = await ProjectProgress.create(input);
    return this.findById(created.id);
  }

  async findById(id) {
    const entry = await ProjectProgress.findByPk(id);
    return entry ? mapProjectProgress(entry) : null;
  }

  async findByProject(projectId) {
    const entries = await ProjectProgress.findAll({
      where: { projectId: Number(projectId) },
      order: [
        ['progressDate', 'DESC'],
        ['id', 'DESC']
      ]
    });
    return entries.map(mapProjectProgress);
  }
}
