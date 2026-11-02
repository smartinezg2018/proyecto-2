import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const BudgetExecution = sequelize.define(
  'BudgetExecution',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    budgetLineId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    executionDate: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: DataTypes.STRING(255),
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'budget_executions', updatedAt: false }
);
