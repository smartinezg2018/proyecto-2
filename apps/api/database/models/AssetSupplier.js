import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const AssetSupplier = sequelize.define(
  'AssetSupplier',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    assetId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    supplierId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'suministro'
    },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'asset_suppliers',
    updatedAt: false
  }
);
