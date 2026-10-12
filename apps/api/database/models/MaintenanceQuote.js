import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const MaintenanceQuote = sequelize.define(
  'MaintenanceQuote',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    maintenanceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'maintenance_id' },
    supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'supplier_id' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    validUntil: { type: DataTypes.DATEONLY, allowNull: false, field: 'valid_until' },
    documentRef: { type: DataTypes.STRING(255), field: 'document_ref' },
    scope: { type: DataTypes.TEXT, allowNull: false },
    conditions: { type: DataTypes.TEXT, allowNull: false },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
  },
  { tableName: 'maintenance_quotes' }
);
