import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const CashReceipt = sequelize.define(
  'CashReceipt',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    paymentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    receiptNumber: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'cash_receipts' }
);
