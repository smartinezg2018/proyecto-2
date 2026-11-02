import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const PaymentAllocation = sequelize.define(
  'PaymentAllocation',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    paymentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    invoiceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
  },
  { tableName: 'payment_allocations', updatedAt: false }
);
