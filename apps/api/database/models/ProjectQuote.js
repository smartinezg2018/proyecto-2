import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const ProjectQuote = sequelize.define(
  'ProjectQuote',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    projectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'project_id' },
    supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'supplier_id' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    validUntil: { type: DataTypes.DATEONLY, allowNull: false, field: 'valid_until' },
    scope: { type: DataTypes.TEXT, allowNull: false },
    conditions: { type: DataTypes.TEXT },
    deliveryDays: { type: DataTypes.INTEGER.UNSIGNED, field: 'delivery_days' },
    documentRef: { type: DataTypes.STRING(255), field: 'document_ref' },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
  },
  { tableName: 'project_quotes' }
);
