import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const AnnualBudget = sequelize.define(
  'AnnualBudget',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'borrador' },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'annual_budgets' }
);
