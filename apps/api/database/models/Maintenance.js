import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Maintenance = sequelize.define(
  'Maintenance',
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
    buildingId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    maintenanceType: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    maintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'maintenances'
  }
);
