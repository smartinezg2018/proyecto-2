import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const AssetCost = sequelize.define(
  'AssetCost',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    assetId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    costType: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    costDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    documentRef: DataTypes.STRING(255),
    notes: DataTypes.TEXT,
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'asset_costs'
  }
);
