import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const ChargeSchedule = sequelize.define(
  'ChargeSchedule',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    chargeType: { type: DataTypes.STRING(20), allowNull: false },
    originPeriod: { type: DataTypes.STRING(7), allowNull: false },
    scheduledPeriod: { type: DataTypes.STRING(7), allowNull: false },
    concept: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    approvalReference: { type: DataTypes.STRING(255) },
    invoiceId: { type: DataTypes.BIGINT.UNSIGNED },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'charge_schedules', updatedAt: false }
);
