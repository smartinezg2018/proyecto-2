import { Op } from 'sequelize';
import { Project, ProjectProgress, ProjectQuote, Supplier } from '../../../../database/models/index.js';
import { mapProjectProgress } from './projectProgressRepository.js';
import { mapProjectQuote } from './projectQuoteRepository.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapProject(project) {
  if (!project) {
    return null;
  }

  const data = project.get({ plain: true });
  return {
    id: data.id,
    buildingId: data.buildingId,
    name: data.name,
    objective: data.objective,
    projectType: data.projectType,
    budget: Number(data.budget),
    startDate: formatDate(data.startDate),
    endDate: formatDate(data.endDate),
    responsible: data.responsible,
    approvalReference: data.approvalReference,
    status: data.status,
    selectedQuoteId: data.selectedQuoteId ?? null,
    selectionJustification: data.selectionJustification ?? null,
    closeDate: formatDate(data.closeDate),
    totalCost:
      data.totalCost === null || data.totalCost === undefined ? null : Number(data.totalCost),
    result: data.result ?? null,
    closingDocumentRef: data.closingDocumentRef ?? null,
    quotes: Array.isArray(data.quotes) ? data.quotes.map(mapProjectQuote) : [],
    progressEntries: Array.isArray(data.progressEntries)
      ? data.progressEntries.map(mapProjectProgress)
      : [],
    currentPercentage: Array.isArray(data.progressEntries) && data.progressEntries.length
      ? Number(mapProjectProgress(data.progressEntries[0]).percentage)
      : 0,
    currentExecutedCost: Array.isArray(data.progressEntries) && data.progressEntries.length
      ? Number(mapProjectProgress(data.progressEntries[0]).executedCost)
      : 0,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class ProjectRepository {
  async create(project) {
    const created = await Project.create({
      buildingId: project.buildingId,
      name: project.name,
      objective: project.objective,
      projectType: project.projectType,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
      responsible: project.responsible,
      approvalReference: project.approvalReference,
      status: project.status,
      createdBy: project.createdBy,
      updatedBy: project.updatedBy
    });

    return mapProject(created);
  }

  async findById(id) {
    const project = await Project.findByPk(id);
    return mapProject(project);
  }

  async findByBuilding(buildingId, filters = {}) {
    const where = { buildingId: Number(buildingId) };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.projectType) {
      where.projectType = filters.projectType;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.startDate = {};
      if (filters.dateFrom) {
        where.startDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.startDate[Op.lte] = filters.dateTo;
      }
    }

    const projects = await Project.findAll({
      where,
      include: [
        {
          model: ProjectQuote,
          as: 'quotes',
          include: [{ model: Supplier, as: 'supplier' }],
          separate: true,
          order: [['id', 'ASC']]
        },
        {
          model: ProjectProgress,
          as: 'progressEntries',
          separate: true,
          order: [
            ['progressDate', 'DESC'],
            ['id', 'DESC']
          ]
        }
      ],
      order: [
        ['startDate', 'DESC'],
        ['id', 'DESC']
      ]
    });

    return projects.map(mapProject);
  }

  async updateSelection(id, selection) {
    await Project.update(
      {
        selectedQuoteId: selection.selectedQuoteId,
        selectionJustification: selection.selectionJustification,
        updatedBy: selection.updatedBy
      },
      { where: { id: Number(id) } }
    );
    return this.findById(id);
  }

  async updateStatus(id, status, updatedBy = null) {
    await Project.update(
      { status, updatedBy },
      { where: { id: Number(id) } }
    );
    return this.findById(id);
  }

  async close(id, closure) {
    await Project.update(
      {
        status: 'finalizado',
        closeDate: closure.closeDate,
        totalCost: closure.totalCost,
        result: closure.result,
        closingDocumentRef: closure.closingDocumentRef,
        updatedBy: closure.updatedBy
      },
      { where: { id: Number(id) } }
    );
    return this.findById(id);
  }
}
