import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Unit = sequelize.define(
  'Unit',
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
    number: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tower: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    kind: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'apartamento'
    },
    coefficient: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'units'
  }
);
