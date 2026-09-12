import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const AssetHistory = sequelize.define(
  'AssetHistory',
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
    changeType: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    field: DataTypes.STRING(50),
    oldValue: DataTypes.TEXT,
    newValue: DataTypes.TEXT,
    reason: DataTypes.STRING(255),
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'asset_history',
    updatedAt: false
  }
);
