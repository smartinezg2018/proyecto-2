import { Op } from 'sequelize';
import { Person, Unit, UnitResponsible } from '../../../../database/models/index.js';

const responsibleInclude = {
  model: UnitResponsible,
  as: 'responsibleAssignment',
  required: false,
  include: [{ model: Person, as: 'person', required: false }]
};

function mapPerson(person) {
  if (!person) {
    return null;
  }

  return {
    id: person.id,
    identification: person.identification,
    name: person.name,
    phone: person.phone,
    email: person.email
  };
}

function mapUnit(unit) {
  if (!unit) {
    return null;
  }

  const data = unit.get({ plain: true });

  return {
    id: data.id,
    buildingId: data.buildingId,
    number: data.number,
    tower: data.tower || '',
    kind: data.kind || 'apartamento',
    coefficient: Number(data.coefficient),
    status: data.status,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    responsible: mapPerson(data.responsibleAssignment?.person)
  };
}

export class UnitRepository {
  async create(unit) {
    const created = await Unit.create({
      buildingId: unit.buildingId,
      number: unit.number,
      tower: unit.tower,
      kind: unit.kind,
      coefficient: unit.coefficient,
      status: unit.status,
      createdBy: unit.createdBy,
      updatedBy: unit.createdBy
    });

    return this.findById(created.id);
  }

  async findById(id) {
    const unit = await Unit.findByPk(id, { include: [responsibleInclude] });
    return mapUnit(unit);
  }

  async findAllByBuilding(buildingId) {
    const units = await Unit.findAll({
      where: { buildingId },
      include: [responsibleInclude],
      order: [
        ['tower', 'ASC'],
        ['number', 'ASC']
      ]
    });

    return units.map(mapUnit);
  }

  async findByBuildingNumberAndTower(buildingId, number, tower, excludedId = null) {
    const where = { buildingId, number, tower };
    if (excludedId !== null && excludedId !== undefined) {
      where.id = { [Op.ne]: excludedId };
    }

    return Unit.findOne({ where, attributes: ['id'] });
  }
}
