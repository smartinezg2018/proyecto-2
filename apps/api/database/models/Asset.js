import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Asset = sequelize.define(
  'Asset',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    buildingId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: DataTypes.TEXT,
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    location: DataTypes.STRING(150),
    providerId: DataTypes.BIGINT.UNSIGNED,
    acquisitionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'assets'
  }
);
