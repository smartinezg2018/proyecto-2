import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Invoice = sequelize.define(
  'Invoice',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    buildingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    period: { type: DataTypes.STRING(7), allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    paymentReference: { type: DataTypes.STRING(50), allowNull: false },
    total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  { tableName: 'invoices' }
);
