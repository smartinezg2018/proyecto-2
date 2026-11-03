import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const BillingExtraCharge = sequelize.define(
  'BillingExtraCharge',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    period: { type: DataTypes.CHAR(7), allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'billing_extra_charges' }
);
