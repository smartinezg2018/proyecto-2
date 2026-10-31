import { Project } from '../../../../database/models/index.js';

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

  async findByBuilding(buildingId) {
    const projects = await Project.findAll({
      where: { buildingId: Number(buildingId) },
      order: [
        ['startDate', 'DESC'],
        ['id', 'DESC']
      ]
    });

    return projects.map(mapProject);
  }
}
