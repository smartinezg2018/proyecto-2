import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const InvoiceItem = sequelize.define(
  'InvoiceItem',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    invoiceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    concept: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
  },
  { tableName: 'invoice_items', updatedAt: false }
);
