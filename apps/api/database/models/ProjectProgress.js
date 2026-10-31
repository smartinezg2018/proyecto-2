import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const ProjectProgress = sequelize.define(
  'ProjectProgress',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    projectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'project_id' },
    progressDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'progress_date' },
    percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    executedCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'executed_cost' },
    observations: { type: DataTypes.TEXT, allowNull: false },
    evidenceRef: { type: DataTypes.STRING(255), field: 'evidence_ref' },
    quoteId: { type: DataTypes.BIGINT.UNSIGNED, field: 'quote_id' },
    supplierId: { type: DataTypes.BIGINT.UNSIGNED, field: 'supplier_id' },
    supplierName: { type: DataTypes.STRING(150), field: 'supplier_name' },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by' }
  },
  { tableName: 'project_progress', updatedAt: false }
);
