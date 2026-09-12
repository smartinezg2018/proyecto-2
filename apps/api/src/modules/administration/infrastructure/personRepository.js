import { sequelize } from '../../../../database/connection.js';
import { Person, UnitResponsible } from '../../../../database/models/index.js';

function mapPerson(person) {
  if (!person) {
    return null;
  }

  const data = person.get({ plain: true });

  return {
    id: data.id,
    identification: data.identification,
    name: data.name,
    phone: data.phone,
    email: data.email,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class PersonRepository {
  async create(person) {
    const created = await Person.create({
      identification: person.identification,
      name: person.name,
      phone: person.phone,
      email: person.email,
      createdBy: person.createdBy,
      updatedBy: person.createdBy
    });

    return this.findById(created.id);
  }

  async findById(id) {
    const person = await Person.findByPk(id);
    return mapPerson(person);
  }

  async findByIdentification(identification) {
    const person = await Person.findOne({ where: { identification } });
    return mapPerson(person);
  }

  async findAll() {
    const persons = await Person.findAll({ order: [['name', 'ASC']] });
    return persons.map(mapPerson);
  }

  async assignToUnits(personId, unitIds, userId = null) {
    await sequelize.transaction(async (transaction) => {
      for (const unitId of unitIds) {
        await UnitResponsible.upsert(
          {
            unitId,
            personId,
            createdBy: userId
          },
          { transaction }
        );
      }
    });
  }
}
