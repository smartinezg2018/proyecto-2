import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const BudgetLine = sequelize.define(
  'BudgetLine',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    budgetId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    classification: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
  },
  { tableName: 'budget_lines' }
);
