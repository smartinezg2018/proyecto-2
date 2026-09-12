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
    type: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    occurredOn: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: DataTypes.TEXT,
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'asset_costs'
  }
);
