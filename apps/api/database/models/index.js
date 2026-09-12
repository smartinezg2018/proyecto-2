import { Person } from './Person.js';
import { Unit } from './Unit.js';
import { UnitResponsible } from './UnitResponsible.js';

Unit.hasOne(UnitResponsible, { foreignKey: 'unitId', as: 'responsibleAssignment' });
UnitResponsible.belongsTo(Unit, { foreignKey: 'unitId' });
UnitResponsible.belongsTo(Person, { foreignKey: 'personId', as: 'person' });
Person.hasMany(UnitResponsible, { foreignKey: 'personId' });

export { Person, Unit, UnitResponsible };
