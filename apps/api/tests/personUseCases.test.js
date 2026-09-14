import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonUseCases } from '../src/modules/administration/application/personUseCases.js';

function createRepositories() {
  const units = [
    { id: 1, buildingId: 1, number: '101' },
    { id: 2, buildingId: 1, number: '102' }
  ];
  const persons = [];
  const assignments = [];

  return {
    unitRepository: {
      async findById(id) {
        return units.find((unit) => String(unit.id) === String(id)) ?? null;
      }
    },
    personRepository: {
      persons,
      assignments,
      async create(person) {
        const created = { id: persons.length + 1, ...person };
        persons.push(created);
        return created;
      },
      async findById(id) {
        return persons.find((person) => String(person.id) === String(id)) ?? null;
      },
      async findByIdentification(identification) {
        return persons.find((person) => person.identification === identification) ?? null;
      },
      async findAll() {
        return persons;
      },
      async assignToUnits(personId, unitIds, userId = null) {
        for (const unitId of unitIds) {
          const current = assignments.find((assignment) => assignment.unitId === unitId);
          if (current) {
            current.personId = personId;
            current.createdBy = userId;
          } else {
            assignments.push({ unitId, personId, createdBy: userId });
          }
        }
      }
    }
  };
}

test('registra un responsable y lo asocia a varios inmuebles sin credenciales', async () => {
  const { personRepository, unitRepository } = createRepositories();
  const useCases = createPersonUseCases(personRepository, unitRepository);

  const person = await useCases.registerResponsible(
    {
      identification: '123456',
      name: 'Ana Pérez',
      phone: '3001234567',
      email: 'ana@example.com',
      unitIds: [1, 2]
    },
    8
  );

  assert.equal(person.identification, '123456');
  assert.equal(person.password, undefined);
  assert.equal(person.units.length, 2);
  assert.equal(personRepository.assignments.length, 2);
  assert.equal(person.createdBy, 8);
});

test('reutiliza un responsable existente y no le crea acceso', async () => {
  const { personRepository, unitRepository } = createRepositories();
  const useCases = createPersonUseCases(personRepository, unitRepository);
  const input = {
    identification: '123456',
    name: 'Ana Pérez',
    unitIds: [1]
  };

  await useCases.registerResponsible(input);
  const person = await useCases.registerResponsible({ ...input, unitIds: [2] });

  assert.equal(personRepository.persons.length, 1);
  assert.equal(person.id, 1);
  assert.equal(personRepository.assignments.length, 2);
});
