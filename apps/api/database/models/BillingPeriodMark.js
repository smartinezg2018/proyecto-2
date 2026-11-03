import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const BillingPeriodMark = sequelize.define(
  'BillingPeriodMark',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    period: { type: DataTypes.CHAR(7), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'billing_period_marks' }
);
