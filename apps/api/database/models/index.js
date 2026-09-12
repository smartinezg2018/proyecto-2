import { Asset } from './Asset.js';
import { AssetHistory } from './AssetHistory.js';
import { Person } from './Person.js';
import { Provider } from './Provider.js';
import { Unit } from './Unit.js';
import { UnitResponsible } from './UnitResponsible.js';

Unit.hasOne(UnitResponsible, { foreignKey: 'unitId', as: 'responsibleAssignment' });
UnitResponsible.belongsTo(Unit, { foreignKey: 'unitId' });
UnitResponsible.belongsTo(Person, { foreignKey: 'personId', as: 'person' });
Person.hasMany(UnitResponsible, { foreignKey: 'personId' });

Asset.hasMany(AssetHistory, { foreignKey: 'assetId', as: 'historyEntries' });
AssetHistory.belongsTo(Asset, { foreignKey: 'assetId' });
Provider.hasMany(Asset, { foreignKey: 'providerId', as: 'assets' });
Asset.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });

export { Asset, AssetHistory, Person, Provider, Unit, UnitResponsible };
