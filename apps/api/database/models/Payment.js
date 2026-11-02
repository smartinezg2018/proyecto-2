import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Payment = sequelize.define(
  'Payment',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    paymentMethod: { type: DataTypes.STRING(30), allowNull: false },
    reference: { type: DataTypes.STRING(100), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'registrado' },
    creditBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'payments' }
);
