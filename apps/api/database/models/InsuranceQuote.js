import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const InsuranceQuote = sequelize.define(
  'InsuranceQuote',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'building_id' },
    insurer: { type: DataTypes.STRING(150), allowNull: false },
    coverage: { type: DataTypes.TEXT, allowNull: false },
    premium: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    validFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'valid_from' },
    validUntil: { type: DataTypes.DATEONLY, allowNull: false, field: 'valid_until' },
    documentRef: { type: DataTypes.STRING(255), field: 'document_ref' },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'created_by' },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
  },
  { tableName: 'insurance_quotes' }
);
