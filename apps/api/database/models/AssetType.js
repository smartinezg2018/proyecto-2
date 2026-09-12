import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const AssetType = sequelize.define(
  'AssetType',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'asset_types'
  }
);
