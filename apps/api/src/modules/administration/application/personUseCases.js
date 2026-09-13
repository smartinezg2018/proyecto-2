import { AppError } from '../../../shared/errors/AppError.js';

function validatePersonInput(input) {
  if (typeof input.identification !== 'string' || input.identification.trim() === '') {
    throw new AppError(
      'La identificación del responsable es obligatoria.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new AppError('El nombre del responsable es obligatorio.', 400, 'VALIDATION_ERROR');
  }

  if (input.phone !== undefined && input.phone !== null && typeof input.phone !== 'string') {
    throw new AppError('El teléfono debe ser texto.', 400, 'VALIDATION_ERROR');
  }

  if (input.email !== undefined && input.email !== null && typeof input.email !== 'string') {
    throw new AppError('El correo debe ser texto.', 400, 'VALIDATION_ERROR');
  }

  if (!Array.isArray(input.unitIds) || input.unitIds.length === 0) {
    throw new AppError(
      'Debe asociar el responsable a por lo menos un inmueble.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function normalizePersonInput(input) {
  return {
    identification: input.identification.trim(),
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    unitIds: [...new Set(input.unitIds.map((unitId) => Number(unitId)))]
  };
}

export function createPersonUseCases(personRepository, unitRepository, audit = null) {
  return {
    async registerResponsible(input, userId = null) {
      validatePersonInput(input);
      const personInput = normalizePersonInput(input);

      for (const unitId of personInput.unitIds) {
        const unit = await unitRepository.findById(unitId);
        if (!unit) {
          throw new AppError(`El inmueble ${unitId} no existe.`, 404, 'UNIT_NOT_FOUND');
        }
      }

      let person = await personRepository.findByIdentification(personInput.identification);
      const wasCreated = !person;
      if (!person) {
        person = await personRepository.create({ ...personInput, createdBy: userId });
      }

      await personRepository.assignToUnits(person.id, personInput.unitIds, userId);
      const units = await Promise.all(
        personInput.unitIds.map((unitId) => unitRepository.findById(unitId))
      );

      if (audit) {
        await audit.record({
          userId,
          action: wasCreated ? 'create' : 'update',
          module: 'administration',
          entity: 'person',
          entityId: person.id,
          buildingId: units[0]?.buildingId ?? null,
          metadata: {
            name: person.name,
            identification: person.identification,
            unitIds: personInput.unitIds
          }
        });
      }

      return { ...person, units };
    },

    async list() {
      return personRepository.findAll();
    }
  };
}
