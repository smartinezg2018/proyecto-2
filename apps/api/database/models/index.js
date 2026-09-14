import { Asset } from './Asset.js';
import { AssetCost } from './AssetCost.js';
import { AssetHistory } from './AssetHistory.js';
import { AssetSupplier } from './AssetSupplier.js';
import { Person } from './Person.js';
import { Supplier } from './Supplier.js';
import { Unit } from './Unit.js';
import { UnitResponsible } from './UnitResponsible.js';

Unit.hasOne(UnitResponsible, { foreignKey: 'unitId', as: 'responsibleAssignment' });
UnitResponsible.belongsTo(Unit, { foreignKey: 'unitId' });
UnitResponsible.belongsTo(Person, { foreignKey: 'personId', as: 'person' });
Person.hasMany(UnitResponsible, { foreignKey: 'personId' });

Asset.hasMany(AssetHistory, { foreignKey: 'assetId', as: 'historyEntries' });
AssetHistory.belongsTo(Asset, { foreignKey: 'assetId' });

Asset.hasOne(AssetSupplier, { foreignKey: 'assetId', as: 'supplierAssignment' });
AssetSupplier.belongsTo(Asset, { foreignKey: 'assetId' });
AssetSupplier.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(AssetSupplier, { foreignKey: 'supplierId' });

Asset.hasMany(AssetCost, { foreignKey: 'assetId', as: 'costs' });
AssetCost.belongsTo(Asset, { foreignKey: 'assetId' });

export {
  Asset,
  AssetCost,
  AssetHistory,
  AssetSupplier,
  Person,
  Supplier,
  Unit,
  UnitResponsible
};
