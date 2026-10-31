import { Asset } from './Asset.js';
import { AssetCost } from './AssetCost.js';
import { AssetHistory } from './AssetHistory.js';
import { AssetSupplier } from './AssetSupplier.js';
import { Maintenance } from './Maintenance.js';
import { MaintenanceStatusHistory } from './MaintenanceStatusHistory.js';
import { MaintenanceQuote } from './MaintenanceQuote.js';
import { InsuranceQuote } from './InsuranceQuote.js';
import { Person } from './Person.js';
import { Supplier } from './Supplier.js';
import { Unit } from './Unit.js';
import { UnitResponsible } from './UnitResponsible.js';
import { Invoice } from './Invoice.js';
import { InvoiceItem } from './InvoiceItem.js';
import { ChargeSchedule } from './ChargeSchedule.js';
import { Project } from './Project.js';
import { ProjectQuote } from './ProjectQuote.js';
import { ProjectProgress } from './ProjectProgress.js';

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

Asset.hasMany(Maintenance, { foreignKey: 'assetId', as: 'maintenances' });
Maintenance.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Maintenance.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Maintenance.hasMany(MaintenanceStatusHistory, {
  foreignKey: 'maintenanceId',
  as: 'statusHistory'
});
MaintenanceStatusHistory.belongsTo(Maintenance, { foreignKey: 'maintenanceId' });
Maintenance.hasMany(MaintenanceQuote, { foreignKey: 'maintenanceId', as: 'quotes' });
MaintenanceQuote.belongsTo(Maintenance, { foreignKey: 'maintenanceId' });
MaintenanceQuote.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(MaintenanceQuote, { foreignKey: 'supplierId' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });
Invoice.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
Unit.hasMany(Invoice, { foreignKey: 'unitId', as: 'invoices' });
ChargeSchedule.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
Unit.hasMany(ChargeSchedule, { foreignKey: 'unitId', as: 'chargeSchedules' });
ChargeSchedule.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Project.hasMany(ProjectQuote, { foreignKey: 'projectId', as: 'quotes' });
ProjectQuote.belongsTo(Project, { foreignKey: 'projectId' });
ProjectQuote.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(ProjectQuote, { foreignKey: 'supplierId', as: 'projectQuotes' });
Project.hasMany(ProjectProgress, { foreignKey: 'projectId', as: 'progressEntries' });
ProjectProgress.belongsTo(Project, { foreignKey: 'projectId' });

export {
  Asset,
  AssetCost,
  AssetHistory,
  AssetSupplier,
  Maintenance,
  MaintenanceStatusHistory,
  MaintenanceQuote,
  InsuranceQuote,
  Person,
  Supplier,
  Unit,
  UnitResponsible,
  Invoice,
  InvoiceItem,
  ChargeSchedule,
  Project,
  ProjectQuote,
  ProjectProgress
};
